// Auth routes disabled — app runs in single-user mode
export async function GET() {
  return new Response('Auth not configured', { status: 404 })
}
export async function POST() {
  return new Response('Auth not configured', { status: 404 })
}
