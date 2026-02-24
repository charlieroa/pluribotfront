import JSZip from 'jszip'

export interface NetlifyDeployResult {
  url: string           // "https://random-name.netlify.app"
  siteId: string
  deployId: string
  adminUrl: string      // "https://app.netlify.com/sites/..."
}

export async function deployToNetlify(
  htmlContent: string,
  existingSiteId?: string
): Promise<NetlifyDeployResult> {
  const token = process.env.NETLIFY_TOKEN
  if (!token) {
    throw new Error('NETLIFY_TOKEN no configurado')
  }

  // Build ZIP with index.html
  const zip = new JSZip()
  zip.file('index.html', htmlContent)

  const zipArrayBuffer = await zip.generateAsync({ type: 'arraybuffer' })
  const zipBlob = new Blob([zipArrayBuffer], { type: 'application/zip' })

  // Create site if needed
  let siteId = existingSiteId
  if (!siteId) {
    const createRes = await fetch('https://api.netlify.com/api/v1/sites', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    if (!createRes.ok) {
      const errText = await createRes.text()
      throw new Error(`Error al crear site en Netlify: ${createRes.status} ${errText}`)
    }

    const siteData = await createRes.json()
    siteId = siteData.id
  }

  // Deploy ZIP to the site
  const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/zip',
    },
    body: zipBlob,
  })

  if (!deployRes.ok) {
    const errText = await deployRes.text()
    throw new Error(`Error al deployar en Netlify: ${deployRes.status} ${errText}`)
  }

  const deployData = await deployRes.json()

  return {
    url: deployData.ssl_url || deployData.url || `https://${deployData.subdomain}.netlify.app`,
    siteId: siteId!,
    deployId: deployData.id,
    adminUrl: `https://app.netlify.com/sites/${deployData.name || deployData.subdomain}/overview`,
  }
}
