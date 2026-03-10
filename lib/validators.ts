import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Kullanıcı adı gerekli"),
  password: z.string().min(1, "Şifre gerekli"),
});

export function zodErrorMessage(error: z.ZodError) {
  return error.errors.map((item) => item.message).join(", ");
}
