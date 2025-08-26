document.addEventListener('DOMContentLoaded', () => {
    const chatWindow = document.getElementById('chat-window');
    const userInput = document.getElementById('user-input');
    const apiUrlInput = document.getElementById('api-url-input');
    const apiKeyInput = document.getElementById('api-key-input');
    const apiModelInput = document.getElementById('api-model-input');
    const sendBtn = document.getElementById('send-btn');
    const characterList = document.getElementById('character-list');
    const addCharacterBtn = document.querySelector('.add-character-btn');

    const modal = document.getElementById('modal');
    const closeBtn = document.querySelector('.close-btn');
    const addCharacterForm = document.getElementById('add-character-form');
    const charNameInput = document.getElementById('char-name');
    const charPromptInput = document.getElementById('char-prompt');
    const charBackgroundInput = document.getElementById('char-background');
    const charModelInput = document.getElementById('char-model');
    const searchBtn = document.getElementById('search-btn');

    const collapsibleHeader = document.getElementById('api-config-header');
    const collapsibleBody = document.getElementById('api-config-body');

    const DEFAULT_API_URL = 'http://localhost:11434/v1/';
    const DEFAULT_MODEL_ID = 'llama3';
    
    apiUrlInput.value = DEFAULT_API_URL;
    apiModelInput.value = DEFAULT_MODEL_ID;

    let chatHistory = [];
    const MAX_HISTORY_MESSAGES = 10;
    const AI_CHAT_TURNS = 2;

    let characters = [
        { name: 'Sora', prompt: '你是一个充满好奇心和创造力的AI，喜欢用富有诗意的语言和大家交流。', background: '', avatar: 'https://placehold.co/50x50', modelId: '' },
        { name: 'Kael', prompt: '你是一位严谨的科学家，说话简洁，注重逻辑和数据。', background: '', avatar: 'https://placehold.co/50x50', modelId: '' },
    ];

    async function getAIResponse(prompt, apiKey, modelId, endpointUrl) {
        if (!endpointUrl || !modelId) {
            throw new Error("API URL 和模型 ID 必须填写。");
        }
        
        const fullUrl = `${endpointUrl}chat/completions`;
        const headers = {
            "Content-Type": "application/json",
        };

        const body = {
            model: modelId,
            messages: [{
                role: "user",
                content: prompt
            }],
            stream: false,
            temperature: 0.7,
            // 移除 max_tokens 限制，允许模型自由发挥
        };

        const response = await fetch(fullUrl, {
            headers: headers,
            method: 'POST',
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API 请求失败: ${response.status} - ${JSON.stringify(errorData)}`);
        }

        const result = await response.json();
        return result?.choices?.[0]?.message?.content || "未获取到有效回复。";
    }

    async function searchCharacterPromptAndBackground(characterName) {
        const endpointUrl = apiUrlInput.value.trim();
        const modelId = apiModelInput.value.trim();
        
        if (!endpointUrl || !modelId) {
            throw new Error("请先填写有效的 API URL 和模型 ID。");
        }

        const promptPrompt = `请生成关于 "${characterName}" 的详细性格设定，用一句话概括。`;
        const backgroundPrompt = `请根据角色 "${characterName}" 的性格，生成一个适合他的故事背景。`;

        try {
            const promptResponse = await getAIResponse(promptPrompt, '', modelId, endpointUrl);
            const backgroundResponse = await getAIResponse(backgroundPrompt, '', modelId, endpointUrl);
            return { prompt: promptResponse, background: backgroundResponse };
        } catch (error) {
            console.error('搜索 API 请求失败:', error);
            throw new Error(`搜索失败: ${error.message}`);
        }
    }

    function renderCharacters() {
        characterList.innerHTML = '';
        characters.forEach((character, index) => {
            const charCard = document.createElement('div');
            charCard.className = 'character-card';
            const backgroundText = character.background ? `<p><b>背景:</b> ${character.background.length > 50 ? character.background.substring(0, 50) + '...' : character.background}</p>` : '';
            charCard.innerHTML = `
                <h4>${character.name}</h4>
                <p><b>性格:</b> ${character.prompt.length > 50 ? character.prompt.substring(0, 50) + '...' : character.prompt}</p>
                ${backgroundText}
                <small>模型: ${character.modelId || '默认'}</small>
                <button class="delete-btn" data-index="${index}">&times;</button>
            `;
            characterList.appendChild(charCard);
        });

        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = e.target.dataset.index;
                characters.splice(index, 1);
                renderCharacters();
            });
        });
    }

    function addMessageToChat(sender, message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(isUser ? 'user' : 'ai');
        messageDiv.innerHTML = `<p><b>${sender}:</b> ${message}</p>`;
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        
        chatHistory.push({ sender, message });
        if (chatHistory.length > MAX_HISTORY_MESSAGES) {
            chatHistory.shift();
        }
    }

    sendBtn.addEventListener('click', async () => {
        const message = userInput.value.trim();
        if (!message) return;

        addMessageToChat('用户', message, true);
        userInput.value = '';

        const endpointUrl = apiUrlInput.value.trim();
        const globalModelId = apiModelInput.value.trim();

        if (!endpointUrl || !globalModelId) {
            addMessageToChat('系统', '错误：API URL 和模型 ID 必须填写。');
            return;
        }

        const allCharactersPrompt = characters.map(c => `角色名称: ${c.name}\n性格设定: ${c.prompt}\n故事背景: ${c.background || '无'}`).join('\n\n');
        
        for (let i = 0; i < AI_CHAT_TURNS; i++) {
            for (const character of characters) {
                const modelToUse = character.modelId || globalModelId;
                const historyPrompt = chatHistory.map(m => `${m.sender}: ${m.message}`).join('\n');
                
                const fullPrompt = `你正在参与一个群聊。这里有所有角色的设定：\n\n${allCharactersPrompt}\n\n以下是群聊的对话历史：\n\n${historyPrompt}\n\n请以你的角色（${character.name}）的身份，根据对话历史和所有角色的设定，说一句不超过200字的话加入对话。不要重复已有的对话，直接说你的回复。`;

                try {
                    const aiResponse = await getAIResponse(fullPrompt, '', modelToUse, endpointUrl);
                    
                    if (aiResponse) {
                        addMessageToChat(character.name, aiResponse);
                    }
                } catch (error) {
                    console.error('API请求失败:', error);
                    addMessageToChat('系统', `与 API 通信时发生错误: ${error.message}`);
                    return;
                }
            }
        }
    });

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            sendBtn.click();
        }
    });

    addCharacterBtn.addEventListener('click', () => {
        modal.style.display = 'block';
    });
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        addCharacterForm.reset();
    });
    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
            addCharacterForm.reset();
        }
    });
    addCharacterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = charNameInput.value;
        const prompt = charPromptInput.value;
        const background = charBackgroundInput.value;
        const modelId = charModelInput.value.trim();
        const newCharacter = { name, prompt, background, avatar: 'https://placehold.co/50x50', modelId };
        characters.push(newCharacter);
        renderCharacters();
        modal.style.display = 'none';
        addCharacterForm.reset();
    });
    
    collapsibleHeader.addEventListener('click', () => {
        collapsibleHeader.classList.toggle('active');
        if (collapsibleBody.style.display === 'flex') {
            collapsibleBody.style.display = 'none';
        } else {
            collapsibleBody.style.display = 'flex';
        }
    });

    searchBtn.addEventListener('click', async () => {
        const charName = charNameInput.value.trim();
        if (!charName) {
            alert('请输入角色名称进行搜索。');
            return;
        }

        searchBtn.textContent = '搜索中...';
        searchBtn.disabled = true;
        charPromptInput.value = '正在搜索性格设定...';
        charBackgroundInput.value = '正在搜索故事背景...';

        try {
            const results = await searchCharacterPromptAndBackground(charName);
            charPromptInput.value = results.prompt;
            charBackgroundInput.value = results.background;
        } catch (error) {
            console.error('搜索失败:', error);
            charPromptInput.value = `搜索失败：${error.message} 请手动填写设定。`;
            charBackgroundInput.value = '';
        } finally {
            searchBtn.textContent = '搜索设定';
            searchBtn.disabled = false;
        }
    });

    renderCharacters();
});
