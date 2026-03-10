import { redirect } from "next/navigation";

export default function SorunlarPage() {
  redirect("/gorevler?tab=sorunlar");
}
