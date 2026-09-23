import express from "express";
import { pool } from "./db.js";
import { redisClient } from "./redis.js";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

//----------------------------

app.get("/", (req, res) => {
    res.send("Hello World");
});

app.get("/hello/:name", (req, res) => {
    res.send("Hello " + req.params.name);
});

app.get("/test-error", (req, res) => {
    res.status(400).json({
        error: "Something went wrong"

    });
});

app.get("/test-db", async (req, res) => {
    const result = await pool.query("SELECT NOW()");
    
    res.json(result.rows[0]);
});

//----------------------

function generateShortCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    let code = "";

    for (let i = 0; i < 6; i++) {
        const index = Math.floor(Math.random() * chars.length);
        code += chars[index];
    }

    return code;
}

app.post("/api/shorten", async (req, res) => {
    const { originalUrl } = req.body;

    try {
        const url = new URL(originalUrl);

        if (url.protocol !== "http:" && url.protocol !== "https:") {
            return res.status(400).json({
                error: "Invalid URL"
            });
        }

        const shortCode = generateShortCode();

        const result = await pool.query(
            `INSERT INTO urls (short_code, original_url)
             VALUES ($1, $2)
             RETURNING short_code, original_url`,
            [shortCode, originalUrl]
        );

        const savedUrl = result.rows[0];

        res.status(201).json({
            shortCode: savedUrl.short_code,
            shortUrl: `http://localhost:33000/${savedUrl.short_code}`
        });

    } catch (error) {
        console.error(error);

        return res.status(400).json({
            error: "Invalid URL"
        });
    }
});


app.get("/api/stats/:shortCode", async (req, res) => {
    const { shortCode } = req.params;

    try {
        const result = await pool.query(
            `SELECT short_code, original_url, clicks, created_at
             FROM urls
             WHERE short_code = $1`,
            [shortCode]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Short URL not found"
            });
        }

        const url = result.rows[0];

        return res.json({
            shortCode: url.short_code,
            originalUrl: url.original_url,
            clicks: url.clicks,
            createdAt: url.created_at
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Internal server error"
        });
    }
});

app.get("/:shortCode", async (req, res) => {
    const { shortCode } = req.params;

    try {
        const cachedUrl = await redisClient.get(`url:${shortCode}`);

        if (cachedUrl) {
            await pool.query(
                `UPDATE urls
                 SET clicks = clicks + 1
                 WHERE short_code = $1`,
                [shortCode]
            );

            return res.redirect(cachedUrl);
        }

        const result = await pool.query(
            `UPDATE urls
             SET clicks = clicks + 1
             WHERE short_code = $1
             RETURNING original_url`,
            [shortCode]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Short URL not found"
            });
        }

        const originalUrl = result.rows[0].original_url;

        await redisClient.set(
            `url:${shortCode}`,
            originalUrl,
            {
                EX: 3600
            }
        );

        return res.redirect(originalUrl);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Internal server error"
        });
    }
});


app.listen(3000, async () => {
    await redisClient.connect();

    console.log("Server is running on http://localhost:3000");
});