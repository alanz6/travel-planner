require('dotenv').config();
const express = require('express');
const csv = require('csv-parser');
const fs = require('fs');
const OpenAI = require('openai');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const readCSV = () => {
  return new Promise((resolve, reject) => {
    const hotels = [];
    fs.createReadStream('hotels.csv')
      .pipe(csv())
      .on('data', (row) => {
        hotels.push(row);
      })
      .on('end', () => {
        resolve(hotels);
      })
      .on('error', reject);
  });
};

app.post('/ask', async (req, res) => {
  const { question } = req.body;
  try {
    // Read hotel data from CSV
    const hotels = await readCSV();
    const hotelData = hotels
      .map(
        (hotel) =>
          `${hotel.hotel_name} with ID ${hotel.hotel_id} has a rating of ${hotel.rating} and was reviewed on ${hotel.published_date}. Review: ${hotel.review_text}`
      )
      .join('\n');

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful travel assistant. Use the provided hotel data to answer the user's question.",
        },
        {
          role: "user",
          content: `Answer the following question based on the hotel data:\n${hotelData}\n\nQuestion: ${question}`,
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    res.json({ answer: response.choices[0].message.content.trim() });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
