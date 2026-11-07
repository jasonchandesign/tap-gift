import { z } from "zod";
import { updateGiftDetails } from "@/lib/gifts";
import { AUDIENCE_IDS, SKIN_IDS } from "@/lib/skins";

const Body = z.object({
  recipientName: z.string().trim().min(1).max(60),
  recipientLastName: z.string().trim().min(1).max(60),
  recipientAge: z.number().int().min(1).max(120),
  skin: z.enum(SKIN_IDS),
  audience: z.enum(AUDIENCE_IDS),
});

export async function PATCH(request: Request, { params }: RouteContext<"/api/gifts/[id]">) {
  const { id } = await params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Please check the form and try again." }, { status: 400 });
  }
  if (!z.uuid().safeParse(id).success || !(await updateGiftDetails(id, parsed.data))) {
    return Response.json({ error: "This gift can't be changed now." }, { status: 409 });
  }
  return Response.json({ id });
}
