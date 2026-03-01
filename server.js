import express from "express";
import 'dotenv/config';
import faqRouter from "./routes/faqRoute.js";

const app = express();

app.use(express.json());
app.use(express.static("public"));
app.use("/faqs", faqRouter);

const PORT = process.env.APP_PORT || 2200;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}/`));

