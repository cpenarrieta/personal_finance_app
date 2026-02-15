import Link from "next/link"

export function DemoBanner() {
  return (
    <div className="bg-primary text-primary-foreground text-center py-2 px-4 text-sm font-medium sticky top-0 z-50">
      You are viewing a demo with sample data.{" "}
      <Link href="/login" className="underline font-bold hover:opacity-80">
        Sign in
      </Link>{" "}
      to use with your own financial data.
    </div>
  )
}
