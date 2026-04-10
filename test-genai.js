const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
    const customFetch = (url, opts) => {
        console.log("Requested URL:", url.toString());
        return Promise.resolve({ ok: true, text: () => Promise.resolve('{}') });
    };

    const genAI = new GoogleGenerativeAI('test_key');
    const model = genAI.getGenerativeModel(
        { model: 'gemini-pro' },
        { baseUrl: 'https://falling-lab-bea2.triho753.workers.dev' }
    );
    
    // Pass customFetch to the second arg or global? Let's check customFetch.
    const model2 = genAI.getGenerativeModel(
        { model: 'gemini-pro' },
        { customFetch: customFetch, baseUrl: 'https://falling-lab-bea2.triho753.workers.dev' }
    );

    try {
        await model2.generateContent("hello");
    } catch (e) {
        console.log(e.message);
    }
}

test();
