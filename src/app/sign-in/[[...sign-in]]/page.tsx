import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div className="grid flex-1 place-items-center px-4 py-12">
      <SignIn />
    </div>
  );
}
