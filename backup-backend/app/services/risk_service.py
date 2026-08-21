from app.firebase.firestore import firestore_service
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class RiskService:
    def __init__(self):
        self.firestore = firestore_service

    def get_risk_status(self, account_number: str) -> Dict[str, Any]:
        """
        Get risk status for an account number based on fraud reports.
        Returns one of: NO_REPORTS, REPORTS_FOUND, EXERCISE_CAUTION
        """
        try:
            # Get fraud reports for this account number
            reports = self.firestore.get_fraud_reports_by_account(account_number)

            if not reports or len(reports) == 0:
                return {
                    "status": "NO_REPORTS",
                    "message": "No reports have been submitted for this account",
                    "reports_count": 0
                }

            # If there are reports, advise caution
            return {
                "status": "REPORTS_FOUND",
                "message": "Reports have been submitted for this account. Exercise caution.",
                "reports_count": len(reports),
                "reports": [
                    {
                        "id": report.get('id'),
                        "reason": report.get('reason'),
                        "created_at": report.get('created_at').isoformat() if hasattr(report.get('created_at'), 'isoformat') else str(report.get('created_at'))
                    }
                    for report in reports[:5]  # Limit to most recent 5 reports
                ]
            }

        except Exception as e:
            logger.error(f"Error getting risk status for account {account_number}: {e}")
            raise

# Singleton instance
risk_service = RiskService()