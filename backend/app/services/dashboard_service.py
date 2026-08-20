from app.firebase.firestore import firestore_service
from datetime import datetime, timedelta
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class DashboardService:
    def __init__(self):
        self.firestore = firestore_service

    def get_dashboard_summary(self, merchant_id: str) -> Dict[str, Any]:
        """
        Get dashboard summary for a merchant.
        """
        try:
            # Get all payments for the merchant (we'll limit for performance)
            payments = self.firestore.get_payments_by_merchant(merchant_id, limit=1000)

            # Calculate today's date range
            today = datetime.utcnow().date()
            today_start = datetime.combine(today, datetime.min.time())
            today_end = datetime.combine(today, datetime.max.time())

            # Initialize counters
            today_count = 0
            confirmed_count = 0
            pending_count = 0
            mismatch_count = 0
            total_confirmed_amount = 0.0
            recent_payments = []

            # Process payments
            for payment in payments:
                created_at = payment.get('created_at')
                if hasattr(created_at, 'timestamp'):  # If it's a Firestore timestamp
                    payment_date = created_at
                elif isinstance(created_at, datetime):
                    payment_date = created_at
                else:
                    # Try to parse if it's a string
                    try:
                        payment_date = datetime.fromisoformat(str(created_at).replace('Z', '+00:00'))
                    except:
                        payment_date = None

                # Count today's payments
                if payment_date and today_start <= payment_date <= today_end:
                    today_count += 1

                # Count by verification status
                status = payment.get('verification_status', '').upper()
                if status == 'CONFIRMED':
                    confirmed_count += 1
                    # Add to total confirmed amount
                    amount = payment.get('amount_claimed', 0)
                    try:
                        total_confirmed_amount += float(amount)
                    except (ValueError, TypeError):
                        pass
                elif status == 'PENDING':
                    pending_count += 1
                elif status == 'MISMATCH':
                    mismatch_count += 1

                # Add to recent payments (most recent first)
                recent_payments.append(payment)

            # Sort recent payments by date (newest first) and take top 10
            recent_payments.sort(
                key=lambda x: x.get('created_at') if hasattr(x.get('created_at'), 'timestamp') else datetime.min,
                reverse=True
            )
            recent_payments = recent_payments[:10]

            # Format recent payments for response
            formatted_recent = []
            for payment in recent_payments:
                formatted_payment = {
                    'id': payment.get('id'),
                    'amount_claimed': payment.get('amount_claimed'),
                    'verification_status': payment.get('verification_status'),
                    'created_at': payment.get('created_at').isoformat() if hasattr(payment.get('created_at'), 'isoformat') else str(payment.get('created_at'))
                }
                formatted_recent.append(formatted_payment)

            return {
                'today_payment_count': today_count,
                'confirmed_payments': confirmed_count,
                'pending_payments': pending_count,
                'mismatched_payments': mismatch_count,
                'total_confirmed_amount': total_confirmed_amount,
                'recent_payments': formatted_recent
            }

        except Exception as e:
            logger.error(f"Error getting dashboard summary for merchant {merchant_id}: {e}")
            raise

# Singleton instance
dashboard_service = DashboardService()