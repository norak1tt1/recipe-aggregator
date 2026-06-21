const API_URL = 'http://localhost:3000';

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const keywordBtns = document.querySelectorAll('.keyword-btn');
const statusMessage = document.getElementById('statusMessage');
const resultsSection = document.getElementById('resultsSection');
const urlList = document.getElementById('urlList');
const resultCount = document.getElementById('resultCount');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const progressPercent = document.getElementById('progressPercent');
const progressSize = document.getElementById('progressSize');
const savedList = document.getElementById('savedList');
const viewerSection = document.getElementById('viewerSection');
const contentViewer = document.getElementById('contentViewer');
const closeViewer = document.getElementById('closeViewer');


function parseRecipeHTML(html, url) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    let title = doc.querySelector('title')?.textContent?.trim() || 'Рецепт';
    title = title.replace(/ - RussianFood\.com$/, '').replace(/ \| RussianFood\.com$/, '');
    if (title.includes('RussianFood.com')) {
        title = title.split(' - ')[0] || title.split(' | ')[0] || 'Рецепт';
    }
    
    const ingredients = [];
    
    const ingrRows = doc.querySelectorAll('.ingr_tr_0, .ingr_tr_1');
    ingrRows.forEach(row => {
        const span = row.querySelector('.padding_l span, .padding_r span, .padding_l');
        if (span) {
            let text = span.textContent?.trim();
            if (text && text.length > 1) {
                text = text.replace(/\s+/g, ' ').trim();
                if (!text.includes('порци') && !text.includes('ingr_title') && !text.includes('Продукты')) {
                    ingredients.push(text);
                }
            }
        }
    });
    
    if (ingredients.length === 0) {
        const table = doc.querySelector('.ingr');
        if (table) {
            const cells = table.querySelectorAll('td');
            cells.forEach(cell => {
                let text = cell.textContent?.trim();
                if (text && text.length > 2 && !text.includes('порци') && !text.includes('Продукты')) {
                    text = text.replace(/\s+/g, ' ').trim();
                    if (text.length > 1) {
                        ingredients.push(text);
                    }
                }
            });
        }
    }
    
    const uniqueIngredients = [];
    ingredients.forEach(item => {
        if (!uniqueIngredients.includes(item) && item.length > 1) {
            uniqueIngredients.push(item);
        }
    });
    
    const steps = [];
    
    const stepDivs = doc.querySelectorAll('.step_n');
    stepDivs.forEach(el => {
        let text = '';
        const paragraphs = el.querySelectorAll('p');
        if (paragraphs.length > 0) {
            paragraphs.forEach(p => {
                const pText = p.textContent?.trim();
                if (pText && pText.length > 10) {
                    text += pText + ' ';
                }
            });
        } else {
            text = el.textContent?.trim() || '';
        }
        
        text = text.replace(/\s+/g, ' ').trim();
        
        if (text.length > 15 && !/^\d+$/.test(text) && !text.includes('img_c') && !text.includes('step_n')) {
            steps.push(text);
        }
    });
    
    if (steps.length === 0) {
        const howcook = doc.querySelector('.howcook');
        if (howcook) {
            const text = howcook.textContent?.trim()?.replace(/^[\d\s\.]+/, '').trim();
            if (text && text.length > 20) {
                steps.push(text);
            }
        }
    }
    
    let imageUrl = '';
    const mainImage = doc.querySelector('.main_image img, .main_image_big');
    if (mainImage) {
        imageUrl = mainImage.src || '';
        if (imageUrl && imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
        if (imageUrl && imageUrl.startsWith('/')) imageUrl = 'https://www.russianfood.com' + imageUrl;
    }
    
    let description = '';
    const descEl = doc.querySelector('.sub_info ~ div p, .recipe_new .padding_l p:not(.search)');
    if (descEl) {
        let descText = descEl.textContent?.trim();
        if (descText && descText.length > 10 && !descText.includes('порци') && !descText.includes('страница')) {
            description = descText;
        }
    }
    
    return {
        title: title || 'Рецепт',
        description: description || 'Рецепт с RussianFood.com',
        ingredients: uniqueIngredients.slice(0, 20),
        steps: steps.slice(0, 15),
        imageUrl: imageUrl,
        sourceUrl: url,
        rawHtml: html
    };
}

function renderRecipeHTML(recipe) {
    const cleanIngredients = recipe.ingredients
        .map(ing => ing.replace(/\s+/g, ' ').trim())
        .filter(ing => ing.length > 1);
    
    const ingredientsHTML = cleanIngredients.length > 0
        ? cleanIngredients.map(ing => `<li>${ing}</li>`).join('')
        : '<li>Ингредиенты не найдены</li>';
    
    const cleanSteps = recipe.steps
        .map(step => step.replace(/\s+/g, ' ').trim())
        .filter(step => step.length > 10);
    
    const stepsHTML = cleanSteps.length > 0
        ? cleanSteps.map((step, i) => `
            <div class="step-item">
                <span class="step-num">${i + 1}</span>
                <span class="step-text">${step}</span>
            </div>
        `).join('')
        : '<p>Шаги приготовления не найдены</p>';
    
    return `
        <div class="recipe-card">
            <div class="recipe-header">
                <h2>🍳 ${recipe.title}</h2>
                <p class="recipe-source">Источник: <a href="${recipe.sourceUrl}" target="_blank">${recipe.sourceUrl}</a></p>
            </div>
            
            ${recipe.imageUrl ? `<img src="${recipe.imageUrl}" alt="${recipe.title}" class="recipe-image">` : ''}
            
            ${recipe.description ? `<p class="recipe-description">${recipe.description}</p>` : ''}
            
            <div class="recipe-body">
                <div class="recipe-ingredients">
                    <h3>📋 Ингредиенты</h3>
                    <ul>${ingredientsHTML}</ul>
                </div>
                
                <div class="recipe-steps">
                    <h3>👨‍🍳 Приготовление</h3>
                    ${stepsHTML}
                </div>
            </div>
        </div>
    `;
}

function saveRecipe(title, content, url) {
    const saved = JSON.parse(localStorage.getItem('recipes') || '{}');
    const id = Date.now().toString();
    
    const parsed = parseRecipeHTML(content, url);
    
    saved[id] = {
        id: id,
        title: parsed.title,
        parsed: parsed,
        rawHtml: content,
        savedAt: new Date().toLocaleString()
    };
    localStorage.setItem('recipes', JSON.stringify(saved));
    renderSavedList();
    showStatus('✅ Рецепт сохранён!', 'success');
}

function getSavedContent(id) {
    const saved = JSON.parse(localStorage.getItem('recipes') || '{}');
    return saved[id];
}

function deleteContent(id) {
    const saved = JSON.parse(localStorage.getItem('recipes') || '{}');
    delete saved[id];
    localStorage.setItem('recipes', JSON.stringify(saved));
    renderSavedList();
    showStatus('🗑️ Рецепт удалён', 'info');
}

function getAllSaved() {
    return JSON.parse(localStorage.getItem('recipes') || '{}');
}


function renderSavedList() {
    const saved = getAllSaved();
    const keys = Object.keys(saved);
    
    if (keys.length === 0) {
        savedList.innerHTML = '<div class="empty-state">📭 Нет сохранённых рецептов</div>';
        return;
    }
    
    savedList.innerHTML = keys.map(key => {
        const item = saved[key];
        return `
            <div class="saved-item">
                <div>
                    <span class="saved-title">📖 ${item.title || 'Без названия'}</span>
                    <span class="saved-date">${item.savedAt || ''}</span>
                </div>
                <div>
                    <button class="view-btn" data-id="${key}">👁️ Просмотреть</button>
                    <button class="delete-btn" data-id="${key}">🗑️ Удалить</button>
                </div>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const item = getSavedContent(id);
            if (item) {
                showContent(item.title, item);
            }
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            if (confirm('Удалить этот рецепт?')) {
                deleteContent(id);
            }
        });
    });
}

async function searchKeyword(keyword) {
    if (!keyword.trim()) {
        showStatus('❌ Введите ключевое слово', 'error');
        return;
    }
    
    hideStatus();
    resultsSection.classList.add('hidden');
    urlList.innerHTML = '';
    
    const searchTerm = keyword.trim().toLowerCase();
    
    const synonyms = {
        'суп': 'супы',
        'супа': 'супы',
        'супов': 'супы',
        'салат': 'салаты',
        'салата': 'салаты',
        'салатов': 'салаты',
        'выпечк': 'выпечка',
        'десерт': 'десерты',
        'десерта': 'десерты',
        'десертов': 'десерты',
        'пирог': 'выпечка',
        'пирога': 'выпечка',
        'пирож': 'выпечка',
        'торт': 'десерты',
        'торта': 'десерты'
    };
    
    let correctedTerm = searchTerm;
    for (const [key, value] of Object.entries(synonyms)) {
        if (searchTerm === key || searchTerm.includes(key)) {
            correctedTerm = value;
            break;
        }
    }
    
    try {
        const response = await fetch(`${API_URL}/api/keywords`);
        const data = await response.json();
        
        if (!data.success) {
            showStatus('❌ Ошибка получения списка категорий', 'error');
            return;
        }
        
        const matchedKeywords = data.keywords.filter(kw => {
            const kwLower = kw.toLowerCase();
            return kwLower.includes(correctedTerm) || 
                   correctedTerm.includes(kwLower) ||
                   kwLower.startsWith(correctedTerm) ||
                   (correctedTerm.length === 1 && kwLower.startsWith(correctedTerm));
        });
        
        if (matchedKeywords.length === 0) {
            resultsSection.classList.remove('hidden');
            urlList.innerHTML = `
                <div class="empty-state" style="padding: 30px; text-align: center; color: #999;">
                    <p>😕 По запросу "<strong>${keyword}</strong>" ничего не найдено</p>
                    <p style="font-size: 14px; margin-top: 10px;">Попробуйте: супы, салаты, выпечка, десерты</p>
                    <p style="font-size: 12px; color: #bbb; margin-top: 5px;">Подсказка: можно ввести "с" для поиска супов и салатов</p>
                </div>
            `;
            resultCount.textContent = '0';
            showStatus(`❌ По запросу "${keyword}" ничего не найдено`, 'error');
            return;
        }
        
        let allUrls = [];
        let categoryNames = [];
        
        for (const kw of matchedKeywords) {
            const urlResponse = await fetch(`${API_URL}/api/search/${encodeURIComponent(kw)}`);
            const urlData = await urlResponse.json();
            if (urlData.success) {
                allUrls = allUrls.concat(urlData.urls);
                categoryNames.push(kw);
            }
        }
        
        if (allUrls.length === 0) {
            showStatus('❌ Рецепты не найдены', 'error');
            return;
        }
        
        resultCount.textContent = allUrls.length;
        
        const categoryInfo = matchedKeywords.length > 1 
            ? `Найдено в категориях: ${categoryNames.join(', ')}` 
            : `Категория: ${categoryNames[0]}`;
        
        urlList.innerHTML = `
            <div style="padding: 10px 0 15px 0; color: #666; font-size: 14px; border-bottom: 1px solid #eee; margin-bottom: 15px;">
                ${categoryInfo} — ${allUrls.length} рецептов
            </div>
            ${allUrls.map(url => `
                <div class="url-item">
                    <span class="url-text">${url}</span>
                    <button class="download-btn" data-url="${encodeURIComponent(url)}">
                        📥 Скачать
                    </button>
                </div>
            `).join('')}
        `;
        
        resultsSection.classList.remove('hidden');
        showStatus(`✅ Найдено ${allUrls.length} рецептов`, 'success');
        
        document.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = decodeURIComponent(e.target.dataset.url);
                downloadContent(url);
            });
        });
        
    } catch (error) {
        showStatus('❌ Ошибка соединения с сервером', 'error');
        console.error(error);
    }
}


async function downloadContent(url) {
    hideStatus();
    hideProgress();
    
    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.disabled = true;
    });
    
    try {
        const response = await fetch(`${API_URL}/api/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки');
        }
        
        const text = await response.text();
        const lines = text.split('\n');
        let content = '';
        let progress = 0;
        let size = 'Неизвестно';
        
        for (const line of lines) {
            if (line.startsWith('progress:')) {
                progress = parseInt(line.replace('progress:', ''));
                showProgress(progress, size);
            } else if (line.startsWith('size:')) {
                size = line.replace('size:', '') + ' КБ';
                showProgress(progress, size);
            } else if (line.startsWith('content:')) {
                const contentStr = line.replace('content:', '');
                content = JSON.parse(contentStr);
            } else if (line.startsWith('error:')) {
                const errorMsg = line.replace('error:', '');
                throw new Error(errorMsg);
            }
        }
        
        if (content) {
            const titleFromUrl = url.split('/').pop() || 'Рецепт';
            saveRecipe(titleFromUrl, content, url);
            hideProgress();
            showStatus('✅ Загрузка завершена! Рецепт сохранён.', 'success');
        }
        
    } catch (error) {
        showStatus('❌ Ошибка загрузки: ' + error.message, 'error');
        hideProgress();
        console.error(error);
    } finally {
        document.querySelectorAll('.download-btn').forEach(btn => {
            btn.disabled = false;
        });
    }
}

function showContent(title, item) {
    viewerSection.classList.remove('hidden');
    
    if (item.parsed && item.parsed.title) {
        contentViewer.innerHTML = renderRecipeHTML(item.parsed);
    } else {
        contentViewer.innerHTML = `
            <h2>🍳 ${title}</h2>
            <div class="content-text">${escapeHtml(item.rawHtml || 'Контент не найден')}</div>
        `;
    }
}

function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.classList.remove('hidden');
}

function hideStatus() {
    statusMessage.classList.add('hidden');
}

function showProgress(percent, size) {
    progressSection.classList.remove('hidden');
    progressBar.style.width = percent + '%';
    progressPercent.textContent = percent + '%';
    progressSize.textContent = `Загружено: ${size}`;
}

function hideProgress() {
    progressSection.classList.add('hidden');
    progressBar.style.width = '0%';
    progressPercent.textContent = '0%';
    progressSize.textContent = 'Загружено: 0 КБ';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
}

closeViewer.addEventListener('click', () => {
    viewerSection.classList.add('hidden');
});

viewerSection.addEventListener('click', (e) => {
    if (e.target === viewerSection) {
        viewerSection.classList.add('hidden');
    }
});

searchBtn.addEventListener('click', () => {
    searchKeyword(searchInput.value);
});

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        searchKeyword(searchInput.value);
    }
});

keywordBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const keyword = btn.dataset.keyword;
        searchInput.value = keyword;
        searchKeyword(keyword);
    });
});

renderSavedList();
console.log('🍳 Агрегатор рецептов загружен!');