export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const payload = req.body;
        
        // Basic Validation
        if (!payload || !payload.uuid) {
            return res.status(400).json({ error: 'Missing UUID' });
        }

        // Extract Vercel Geolocation headers for City-Wise tracking (Without logging raw GPS)
        // Fallback to 'Unknown' if developing locally
        const cityRegion = req.headers['x-vercel-ip-city'] || 'Unknown';

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;

        // Upsert to Supabase via REST API for maximum performance and zero dependencies
        const response = await fetch(`${supabaseUrl}/rest/v1/install_logs?on_conflict=uuid`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
                uuid: payload.uuid,
                total_messages_forwarded: payload.total_messages_forwarded || 0,
                max_cluster_size: payload.max_cluster_size || 0,
                city_region: cityRegion,
                updated_at: new Date().toISOString()
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Supabase Error:', errorData);
            return res.status(500).json({ error: 'Database sync failed' });
        }

        return res.status(200).json({ success: true, message: 'Telemetry Synced' });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
