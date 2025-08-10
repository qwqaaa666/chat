document.addEventListener('DOMContentLoaded', () => {
    const chatWindow = document.getElementById('chat-window');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const characterList = document.getElementById('character-list');
    const addCharacterBtn = document.querySelector('.add-character-btn');

    const modal = document.getElementById('modal');
    const closeBtn = document.querySelector('.close-btn');
    const addCharacterForm = document.getElementById('add-character-form');
    const charNameInput = document.getElementById('char-name');
    const charPromptInput = document.getElementById('char-prompt');
    const charModelInput = document.getElementById('char-model');
    const searchBtn = document.getElementById('search-btn');

    // 硬编码的公共 API 配置
    const PUBLIC_API_URL = 'https://api-inference.huggingface.co/models/';
    const PUBLIC_MODEL_ID = 'lmsys/fastchat-t5-3b-v1.0';
    
    // API 配置区域隐藏，以提供零配置体验
    const apiConfigSection = document.getElementById('api-config-header').parentElement;
    apiConfigSection.style.display = 'none';

    let characters = [
        { name: 'Sora', prompt: '你是一个充满好奇心和创造力的AI，喜欢用富有诗意的语言和大家交流。', avatar: 'https://placehold.co/50x50', modelId: '' },
        { name: 'Kael', prompt: '你是一位严谨的科学家，说话简洁，注重逻辑和数据。', avatar: 'https://placehold.co/50x50', modelId: '' },
    ];

    /**
     * 发送 API 请求到 Hugging Face Inference API。
     */
    async function getAIResponse(prompt, modelId) {
        const fullUrl = `${PUBLIC_API_URL}${modelId}`;
        const headers = { "Content-Type": "application/json" };

        const body = {
            inputs: prompt,
            parameters: {
                max_new_tokens: 200,
                temperature: 0.7,
                do_sample: true,
                return_full_text: false
            }
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
        return result?.[0]?.generated_text || "未获取到有效回复。";
    }

    async function searchCharacterInfo(characterName) {
        const modelId = PUBLIC_MODEL_ID;
        const searchPrompt = `请生成关于 "${characterName}" 的详细设定，包括其背景、性格和主要事迹。`;
    
        try {
            const searchResponse = await getAIResponse(searchPrompt, modelId);
            return searchResponse;
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
            charCard.innerHTML = `
                <h4>${character.name}</h4>
                <p>${character.prompt.length > 50 ? character.prompt.substring(0, 50) + '...' : character.prompt}</p >
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
        messageDiv.innerHTML = message;
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    sendBtn.addEventListener('click', async () => {
        const message = userInput.value.trim();
        if (!message) return;

        addMessageToChat('用户', message, true);
        userInput.value = '';

        const globalModelId = PUBLIC_MODEL_ID;

        for (const character of characters) {
            const modelToUse = character.modelId || globalModelId;
            const fullPrompt = `你是一个名为 ${character.name} 的AI，你的性格设定是：“${character.prompt}”。请根据以下群聊对话内容进行回复，保持你的角色：\n\n用户：${message}`;
            
            const loadingMessage = document.createElement('div');
            loadingMessage.classList.add('message', 'ai', 'loading');
            loadingMessage.textContent = `${character.name} (模型: ${modelToUse || '默认'}) 正在思考...`;
            chatWindow.appendChild(loadingMessage);
            chatWindow.scrollTop = chatWindow.scrollHeight;

            try {
                const aiResponse = await getAIResponse(fullPrompt, modelToUse);
                
                chatWindow.removeChild(loadingMessage);
                if (aiResponse) {
                    addMessageToChat(character.name, aiResponse);
                } else {
                    addMessageToChat('系统', `API 返回了空响应。`);
                }
            } catch (error) {
                console.error('API请求失败:', error);
                chatWindow.removeChild(loadingMessage);
                addMessageToChat('系统', `与 API 通信时发生错误: ${error.message}`);
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
        const modelId = charModelInput.value.trim();
        const newCharacter = { name, prompt, avatar: 'https://placehold.co/50x50', modelId };
        characters.push(newCharacter);
        renderCharacters();
        modal.style.display = 'none';
        addCharacterForm.reset();
    });
    
    // searchBtn.addEventListener('click', ...); // 搜索功能暂时保留，但可能会因为网络问题而失败

    renderCharacters();
});
