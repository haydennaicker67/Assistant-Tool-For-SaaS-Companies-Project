import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="flex justify-between items-center p-6 max-w-6xl mx-auto">
        <div className="text-2xl font-bold text-gray-900">Vizzly SA</div>
        <div className="flex gap-4">
          <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
            Sign In
          </Link>
          <Link href="/login" className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto text-center py-24 px-6">
        <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight mb-6">
          Embeddable analytics for <span className="text-blue-600">South African SaaS</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10">
          Give your customers their own dashboards, powered by AI. 
          Row-level security enforced at the database layer. Your data never leaves your servers.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/login" className="px-8 py-4 bg-blue-600 text-white rounded-lg text-lg font-bold hover:bg-blue-700">
            Start Building Free
          </Link>
          <Link href="#docs" className="px-8 py-4 bg-gray-100 text-gray-800 rounded-lg text-lg font-bold hover:bg-gray-200">
            Read the Docs
          </Link>
        </div>
      </main>

      {/* POPIA / Trust Section */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Built for POPIA Compliance</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Global competitors route your customers' data through US or EU servers. 
            Vizzly queries your database directly. We see schema and queries, but <strong>never</strong> store your rows.
          </p>
        </div>
      </section>
    </div>
  );
}