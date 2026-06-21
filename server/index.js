const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

const loadRecipes = () => {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'data/recipes.json'), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        return {};
    }
};

app.get('/api/search/:keyword', (req, res) => {
    try {
        const keyword = req.params.keyword.toLowerCase();
        const recipes = loadRecipes();
        
        if (recipes[keyword]) {
            res.json({
                success: true,
                keyword: keyword,
                urls: recipes[keyword]
            });
        } else {
            res.status(404).json({
                success: false,
                message: `По ключевому слову "${keyword}" ничего не найдено`
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера: ' + error.message
        });
    }
});

app.post('/api/download', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'URL не указан'
            });
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'arraybuffer', 
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            onDownloadProgress: (progressEvent) => {
                const total = progressEvent.total;
                const current = progressEvent.loaded;
                const percent = total ? Math.round((current / total) * 100) : 0;
                
                res.write(`progress:${percent}\n`);
                if (total) {
                    res.write(`size:${(total / 1024).toFixed(1)}\n`);
                }
            }
        });

        const iconv = require('iconv-lite');
        let content = iconv.decode(response.data, 'windows-1251');
        
        content = content.replace(/�/g, '');
        
        res.write(`content:${JSON.stringify(content)}\n`);
        res.write(`done:true\n`);
        res.end();

    } catch (error) {
        console.error('Ошибка скачивания:', error.message);
        res.write(`error:${error.message}\n`);
        res.end();
    }
});

app.get('/api/keywords', (req, res) => {
    try {
        const recipes = loadRecipes();
        const keywords = Object.keys(recipes);
        res.json({
            success: true,
            keywords: keywords
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера: ' + error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`🍳 Сервер запущен на http://localhost:${PORT}`);
    console.log('Доступные ключевые слова:', Object.keys(loadRecipes()).join(', '));
});