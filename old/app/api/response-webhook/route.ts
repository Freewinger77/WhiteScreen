import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (req.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.json();
    
    // Vapi webhook signature verification (optional but recommended)
    const signature = req.headers.get("x-vapi-signature");
    
    // Note: Vapi signature verification can be added here when webhook secret is configured
    // For now, we'll process all webhooks (can add verification later)
    
    const { event, payload } = body;

    // Handle different Vapi events (Vapi uses dot notation for events)
    switch (event) {
      case "call.started":
      case "assistant-request":
        console.log("Call started event received", payload?.call?.id);
        break;
        
      case "call.ended":
      case "end-of-call-report":
        console.log("Call ended event received", payload?.call?.id);
        
        // Trigger analytics when call ends
        if (payload?.call?.id) {
          try {
            const origin = req.nextUrl.origin;
            await axios.post(`${origin}/api/get-call`, {
              id: payload.call.id,
            });
            console.log("Analytics triggered for call:", payload.call.id);
          } catch (error) {
            console.error("Error triggering analytics:", error);
          }
        }
        break;
        
      case "transcript":
        console.log("Transcript update received", payload?.call?.id);
        break;
        
      case "function-call":
        console.log("Function call received", payload);
      break;
        
      case "speech-update":
        console.log("Speech update received");
      break;
        
      case "status-update":
        console.log("Status update received", payload?.status);
      break;
        
    default:
        console.log("Received unknown Vapi event:", event);
  }

  // Acknowledge the receipt of the event
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Error processing Vapi webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
