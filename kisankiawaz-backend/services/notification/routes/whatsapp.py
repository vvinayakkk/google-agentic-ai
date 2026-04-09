"""WhatsApp webhook routes."""

from fastapi import APIRouter, BackgroundTasks, Request, Response

from services.whatsapp_bridge_service import WhatsAppBridgeService

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])


def _derive_public_base_url(request: Request) -> str:
    xfh = str(request.headers.get("x-forwarded-host") or "").strip()
    host = (xfh.split(",", 1)[0].strip() if xfh else "") or str(request.headers.get("host") or "").strip()
    xfp = str(request.headers.get("x-forwarded-proto") or "").strip()
    scheme = (xfp.split(",", 1)[0].strip() if xfp else "") or request.url.scheme
    if not host:
        return str(request.base_url).rstrip("/")
    return f"{scheme}://{host}".rstrip("/")


@router.post("/twilio/webhook")
async def twilio_whatsapp_webhook(
    background_tasks: BackgroundTasks,
    request: Request,
):
    """Receive inbound Twilio WhatsApp messages and process asynchronously."""
    if not WhatsAppBridgeService.is_enabled():
        return Response(content="<Response></Response>", media_type="application/xml")

    form = await request.form()
    message_sid = str(form.get("MessageSid") or "").strip()
    sender = str(form.get("From") or "").strip()
    body = str(form.get("Body") or "").strip()
    profile_name = str(form.get("ProfileName") or "").strip() or None

    media_url = ""
    media_content_type = ""
    try:
        num_media = max(0, int(str(form.get("NumMedia") or "0").strip() or "0"))
    except Exception:
        num_media = 0
    for idx in range(num_media):
        candidate_url = str(form.get(f"MediaUrl{idx}") or "").strip()
        candidate_type = str(form.get(f"MediaContentType{idx}") or "").strip().lower()
        if not candidate_url:
            continue
        if candidate_type.startswith("audio/"):
            media_url = candidate_url
            media_content_type = candidate_type
            break
        if not media_url:
            media_url = candidate_url
            media_content_type = candidate_type

    if sender and (body or media_url):
        background_tasks.add_task(
            WhatsAppBridgeService.handle_incoming_message,
            message_sid=message_sid,
            sender=sender,
            message_body=body,
            profile_name=profile_name,
            media_url=media_url or None,
            media_content_type=media_content_type or None,
            public_base_url=_derive_public_base_url(request),
        )

    # Twilio requires valid TwiML in webhook responses.
    return Response(content="<Response></Response>", media_type="application/xml")


@router.get("/media/{media_id}")
async def twilio_whatsapp_media(media_id: str):
    """Temporary public media endpoint for Twilio to fetch generated voice replies."""
    audio_bytes, content_type = await WhatsAppBridgeService.get_temp_voice_media(media_id)
    if not audio_bytes:
        return Response(status_code=404, content="")
    ctype = content_type or "audio/wav"
    filename = "voice_reply.wav"
    if ctype == "audio/ogg":
        filename = "voice_reply.ogg"
    elif ctype == "audio/mpeg":
        filename = "voice_reply.mp3"
    return Response(
        content=audio_bytes,
        media_type=ctype,
        headers={
            "Content-Disposition": f"inline; filename={filename}",
            "Cache-Control": "no-store",
        },
    )
