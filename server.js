const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { OpenAI } = require("openai");

// Initialize Express app
const app = express();
const port = 3000;

// Initialize OpenAI API client
const openai = new OpenAI({
    apiKey: ".....", // !!!!!!! USE OPEN AI API key!!!!!!
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve static files like HTML, CSS, etc.

// File upload configuration
const upload = multer({ dest: "uploads/" });

// Utility to wrap exec in a Promise
const execPromise = (command) => {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) reject({ error, stderr });
            else resolve(stdout);
        });
    });
};

// Endpoint to handle file upload and analysis
app.post("/upload", upload.single("dataset"), async (req, res) => {
    const filePath = path.resolve(req.file.path);

    try {
        // Run the Python script to analyze the dataset
        const stdout = await execPromise(`python analysis.py ${filePath}`);

        // Delete the uploaded file to save space
        fs.unlinkSync(filePath);

        // Parse Python script output (analysis results)
        const analysisResults = JSON.parse(stdout);

        // Generate conclusions and recommendations using OpenAI ChatGPT
        const prompt = `
            Based on this data analysis:
            - Top Items: ${JSON.stringify(analysisResults.top_items)}
            - Revenue by Transaction Type: ${JSON.stringify(analysisResults.transaction_revenue)}
            - R² Score: ${analysisResults.r2_score.toFixed(2)}

            Write a concise conclusion and provide recommendations to improve sales.
        `;

        const chatResponse = await openai.chat.completions.create({
            model: "gpt-4", 
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: prompt },
            ],
            max_tokens: 200,
        });

        // Extract and add GPT-generated output to the response
        const chatOutput = chatResponse.choices[0].message.content.trim();
        analysisResults.gpt_conclusion = chatOutput;

        // Send the combined results back to the client
        res.send(analysisResults);
    } catch (err) {
        console.error(`Error: ${err.stderr || err.message}`);
        res.status(500).send({ error: err.stderr || "Analysis or recommendation generation failed." });
    }
});



app.use("/static", express.static(path.join(__dirname, "static")));

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
