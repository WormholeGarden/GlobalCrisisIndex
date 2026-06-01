// Deploy this to Cloudflare Workers (free) or any serverless function
export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }
    
    const { email } = await request.json();
    
    // Validate email
    if (!email || !email.includes('@')) {
      return new Response('Invalid email', { status: 400 });
    }
    
    // Call Airtable from BACKEND (API key hidden)
    const response = await fetch('https://api.airtable.com/v0/app5RcMj4TSLHraH9/Waitlist', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer patC6zVFSofyfnQwi.a75220222551de0f20d5f4cdd8bfd630f3a272b0c8c0e488f9a68644398546d8',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({records: [{fields: {Email: email}}]})
    });
    
    const data = await response.json();
    return new Response(JSON.stringify(data), { status: response.status });
  }
}
