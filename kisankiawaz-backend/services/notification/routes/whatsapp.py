"""WhatsApp webhook routes."""

from fastapi import APIRouter, BackgroundTasks, Form, Response

from services.whatsapp_bridge_service import WhatsAppBridgeService

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])


@router.post("/twilio/webhook")
async def twilio_whatsapp_webhook(
    background_tasks: BackgroundTasks,
    MessageSid: str = Form(default=""),
    From: str = Form(default=""),
    Body: str = Form(default=""),
    ProfileName: str = Form(default=""),
):
    """Receive inbound Twilio WhatsApp messages and process asynchronously."""
    if not WhatsAppBridgeService.is_enabled():
        return Response(content="<Response></Response>", media_type="application/xml")

    body = str(Body or "").strip()
    sender = str(From or "").strip()
    if body and sender:
        background_tasks.add_task(
            WhatsAppBridgeService.handle_incoming_message,
            message_sid=str(MessageSid or "").strip(),
            sender=sender,
            message_body=body,
            profile_name=str(ProfileName or "").strip() or None,
        )

    # Twilio requires valid TwiML in webhook responses.
    return Response(content="<Response></Response>", media_type="application/xml")
