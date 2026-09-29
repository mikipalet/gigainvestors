import { ValueLink } from "@/components/value/ValueLink";
export default function NotFound() {
  return <><h1 className="text-3xl font-semibold">Company not found</h1><p className="mt-4"><ValueLink href="/" className="underline">Return to the checklist</ValueLink></p></>;
}
