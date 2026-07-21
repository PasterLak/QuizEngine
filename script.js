let allQuestions = [];
let filteredQuestions = [];
let incorrectQuestions = [];
let currentQuestionIndex = 0;
let currentQuestionType = '';
let correctCount = 0;
let incorrectCount = 0;

async function init() {
    try {
        const res = await fetch('subjects.json');
        if (!res.ok) throw new Error('subjects.json not found');
        const subjects = await res.json();
        
        const select = document.getElementById('subject-select');
        select.innerHTML = '<option value="">Select subject...</option>';
        subjects.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub;
            opt.textContent = sub;
            select.appendChild(opt);
        });
        
        select.disabled = false;
    } catch (error) {
        document.getElementById('setup-error').textContent = 'Error: Create subjects.json file with subject folder names.';
    }
}

function updateQuestionCountDisplay() {
    if (allQuestions.length === 0) {
        document.getElementById('question-count-display').textContent = '';
        return;
    }
    const selectedCategory = document.getElementById('category-select').value;
    let count = allQuestions.length;
    
    if (selectedCategory !== 'All') {
        count = allQuestions.filter(q => q.category === selectedCategory).length;
    }
    
    document.getElementById('question-count-display').textContent = `Total questions: ${count}`;
}

document.getElementById('category-select').addEventListener('change', updateQuestionCountDisplay);

document.getElementById('subject-select').addEventListener('change', async (event) => {
    const subject = event.target.value;
    if (!subject) {
        document.getElementById('category-select').disabled = true;
        document.getElementById('start-btn').disabled = true;
        document.getElementById('question-count-display').textContent = '';
        return;
    }

    document.getElementById('setup-error').textContent = 'Loading...';
    document.getElementById('category-select').disabled = true;
    document.getElementById('start-btn').disabled = true;
    document.getElementById('question-count-display').textContent = '';
    allQuestions = [];
    
    const categories = ['A', 'B', 'C', 'D', 'E'];
    const fetchPromises = [];
    
    for (const cat of categories) {
        for (let i = 1; i <= 99; i++) {
            const path = `questions/${subject}/${cat.toLowerCase()}${i}.json`;
            fetchPromises.push(
                fetch(path)
                .then(async res => {
                    if (res.ok) {
                        const q = await res.json();
                        q.filename = `${cat.toLowerCase()}${i}`;
                        allQuestions.push(q);
                    }
                })
                .catch(() => {})
            );
        }
    }
    
    await Promise.all(fetchPromises);
    
    if (allQuestions.length === 0) {
        document.getElementById('setup-error').textContent = `No questions found in questions/${subject}/`;
        return;
    }

    document.getElementById('setup-error').textContent = '';
    setupCategories();
    document.getElementById('category-select').disabled = false;
    document.getElementById('start-btn').disabled = false;
    updateQuestionCountDisplay();
});

function setupCategories() {
    const categories = [...new Set(allQuestions.map(q => q.category).filter(Boolean))];
    const select = document.getElementById('category-select');
    select.innerHTML = '<option value="All">All Categories</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = `Category ${cat}`;
        select.appendChild(option);
    });
}

document.getElementById('start-btn').addEventListener('click', () => {
    const selectedCategory = document.getElementById('category-select').value;
    if (selectedCategory === 'All') {
        filteredQuestions = [...allQuestions];
    } else {
        filteredQuestions = allQuestions.filter(q => q.category === selectedCategory);
    }
    
    startQuizFlow();
});

function startQuizFlow() {
    if (document.getElementById('shuffle-questions').checked) {
        filteredQuestions.sort(() => Math.random() - 0.5);
    }
    
    currentQuestionIndex = 0;
    correctCount = 0;
    incorrectCount = 0;
    incorrectQuestions = [];
    
    document.getElementById('setup-container').style.display = 'none';
    document.getElementById('quiz-container').style.display = 'block';
    
    updateRetryButtonsVisibility();
    showQuestion();
}

function handleRetry() {
    filteredQuestions = [...incorrectQuestions];
    startQuizFlow();
}

document.getElementById('retry-btn').addEventListener('click', handleRetry);

document.getElementById('exit-btn').addEventListener('click', () => {
    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('setup-container').style.display = 'block';
});

function determineType(q) {
    if (q.options && Array.isArray(q.options)) {
        if (Array.isArray(q.answer) && q.answer.length > 1) {
            return 'multiple';
        }
        return 'single';
    }
    return 'text';
}

function updateProgressDisplay() {
    if (currentQuestionIndex >= filteredQuestions.length) return;
    document.getElementById('progress-text').innerHTML = `
        <span class="score-green">${correctCount}</span> / <span class="score-red">${incorrectCount}</span>
        <span class="score-divider">|</span>
        ${currentQuestionIndex + 1} / ${filteredQuestions.length}
    `;
}

function updateRetryButtonsVisibility() {
    if (incorrectCount > 0) {
        document.getElementById('retry-btn').style.display = 'inline-block';
    } else {
        document.getElementById('retry-btn').style.display = 'none';
    }
}

function showQuestion() {
    document.getElementById('result-area').innerHTML = '';
    document.getElementById('submit-btn').style.display = 'inline-block';
    document.getElementById('next-btn').style.display = 'none';
    
    updateRetryButtonsVisibility();
    
    if (currentQuestionIndex >= filteredQuestions.length) {
        document.getElementById('question-text').innerHTML = '<h2>Quiz Finished!</h2>';
        document.getElementById('input-container').innerHTML = '';
        document.getElementById('submit-btn').style.display = 'none';
        document.getElementById('category-letter').textContent = '';
        document.getElementById('category-topic').textContent = '';
        document.getElementById('question-filename').textContent = '';
        
        document.getElementById('progress-text').innerHTML = `
            <span class="score-green">${correctCount}</span> / <span class="score-red">${incorrectCount}</span>
        `;
        return;
    }

    const q = filteredQuestions[currentQuestionIndex];
    currentQuestionType = determineType(q);

    updateProgressDisplay();
    document.getElementById('category-letter').textContent = q.category || '';
    document.getElementById('category-topic').textContent = q.topic || '';
    document.getElementById('question-filename').textContent = q.filename || '';
    document.getElementById('question-text').textContent = q.question;

    const inputContainer = document.getElementById('input-container');
    inputContainer.innerHTML = '';

    if (currentQuestionType === 'single' || currentQuestionType === 'multiple') {
        const inputType = currentQuestionType === 'single' ? 'radio' : 'checkbox';
        
        let displayOptions = [...q.options];
        if (document.getElementById('shuffle-options').checked) {
            displayOptions.sort(() => Math.random() - 0.5);
        }
        
        displayOptions.forEach((opt) => {
            const label = document.createElement('label');
            label.className = 'option-label';
            const input = document.createElement('input');
            input.type = inputType;
            input.name = 'quiz-option';
            input.value = opt;
            label.appendChild(input);
            label.appendChild(document.createTextNode(opt));
            inputContainer.appendChild(label);
        });
    } else {
        const textarea = document.createElement('textarea');
        textarea.id = 'text-answer';
        inputContainer.appendChild(textarea);
    }
}

function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    let costs = [];
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i === 0) {
                costs[j] = j;
            } else {
                if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    }
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

function calculateSimilarity(s1, s2) {
    let longer = s1;
    let shorter = s2;
    if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
    }
    let longerLength = longer.length;
    if (longerLength === 0) return 100;
    return ((longerLength - editDistance(longer, shorter)) / parseFloat(longerLength)) * 100;
}

document.getElementById('submit-btn').addEventListener('click', () => {
    const q = filteredQuestions[currentQuestionIndex];
    const resultArea = document.getElementById('result-area');
    let isCorrect = false;
    let feedback = '';

    if (currentQuestionType === 'single') {
        const selected = document.querySelector('input[name="quiz-option"]:checked');
        const correctAnswer = Array.isArray(q.answer) ? q.answer[0] : q.answer;
        
        document.querySelectorAll('input[name="quiz-option"]').forEach(input => {
            if (input.value === correctAnswer) {
                input.parentElement.classList.add('correct-choice');
            }
        });

        if (selected) {
            isCorrect = selected.value === correctAnswer;
            if (!isCorrect) {
                selected.parentElement.classList.add('incorrect-choice');
            }
            feedback = isCorrect ? '<span class="correct">Correct!</span>' : `<span class="incorrect">Incorrect.</span>`;
        }
    } else if (currentQuestionType === 'multiple') {
        const selectedElements = Array.from(document.querySelectorAll('input[name="quiz-option"]:checked'));
        const selected = selectedElements.map(el => el.value);
        const correctAnswers = Array.isArray(q.answer) ? q.answer : [q.answer];
        
        document.querySelectorAll('input[name="quiz-option"]').forEach(input => {
            if (correctAnswers.includes(input.value)) {
                input.parentElement.classList.add('correct-choice');
            } else if (input.checked) {
                input.parentElement.classList.add('incorrect-choice');
            }
        });

        isCorrect = selected.length === correctAnswers.length && selected.every(val => correctAnswers.includes(val));
        feedback = isCorrect ? '<span class="correct">Correct!</span>' : `<span class="incorrect">Incorrect or not all options selected</span>`;
    } else {
        const textVal = document.getElementById('text-answer').value;
        const correctAnswer = q.answer;
        const sim = calculateSimilarity(textVal, correctAnswer);
        
        isCorrect = sim >= 80;
        feedback = `Similarity: <strong>${sim.toFixed(1)}%</strong><br><br>Your answer: ${textVal}<br>The correct answer is: ${correctAnswer}`;
    }

    if (isCorrect) {
        correctCount++;
    } else {
        incorrectCount++;
        if (!incorrectQuestions.includes(q)) {
            incorrectQuestions.push(q);
        }
    }

    updateProgressDisplay();
    updateRetryButtonsVisibility();
    resultArea.innerHTML = feedback;
    document.getElementById('submit-btn').style.display = 'none';
    document.getElementById('next-btn').style.display = 'inline-block';
});

document.getElementById('next-btn').addEventListener('click', () => {
    currentQuestionIndex++;
    showQuestion();
});

window.onload = init;