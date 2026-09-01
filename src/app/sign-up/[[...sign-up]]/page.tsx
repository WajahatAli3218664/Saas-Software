import { SignUp } from "@clerk/nextjs";

export const metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <div className="grid flex-1 place-items-center px-4 py-12">
      <SignUp />
    </div>
  );
}
