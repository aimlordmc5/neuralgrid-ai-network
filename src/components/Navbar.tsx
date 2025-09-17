import Link from "next/link";

export const Navbar = () => {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold">
          NeuralGrid
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:underline underline-offset-4">Dashboard</Link>
          <Link href="/jobs" className="hover:underline underline-offset-4">Jobs</Link>
          <Link href="/earnings" className="hover:underline underline-offset-4">Earnings</Link>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;