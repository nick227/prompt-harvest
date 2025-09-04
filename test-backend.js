import fetch from 'node-fetch';

async function testBackend() {
    try {
        console.log('Testing backend routes...');

        // Test credit packages endpoint
        const response = await fetch('http://localhost:3200/api/credit-packages');
        console.log('Credit packages status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('Credit packages data:', data);
        } else {
            console.log('Error response:', await response.text());
        }

    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

testBackend();
