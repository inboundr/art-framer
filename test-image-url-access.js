// Quick test to check if image URLs are accessible
const testImageUrl = process.argv[2];

if (!testImageUrl) {
  console.log('Usage: node test-image-url-access.js <image-url>');
  process.exit(1);
}

console.log('Testing image URL accessibility:', testImageUrl);

fetch(testImageUrl, { method: 'HEAD' })
  .then(response => {
    console.log('✅ Image is accessible!');
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    console.log('Content-Length:', response.headers.get('content-length'));
  })
  .catch(error => {
    console.error('❌ Image is NOT accessible!');
    console.error('Error:', error.message);
  });
