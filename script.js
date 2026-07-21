let allQuestions = [];
let filteredQuestions = [];
let incorrectQuestions = [];
let currentQuestionIndex = 0;
let currentQuestionType = '';
let correctCount = 0;
let incorrectCount = 0;
let currentQuestionsJson = null;
let studyMode = false;
let quizProgress = null;

function getQuizProgress() {
    try {
        return JSON.parse(localStorage.getItem('quiz_progress')) || null;
    } catch (e) {
        return null;
    }
}

function saveQuizProgress(extra = {}) {
    if (!document.getElementById('subject-select').value || filteredQuestions.length === 0) return;

    const progress = {
        subject: document.getElementById('subject-select').value,
        category: document.getElementById('category-select').value,
        studyMode,
        shuffleQuestions: document.getElementById('shuffle-questions').checked,
        shuffleOptions: document.getElementById('shuffle-options').checked,
        questionIds: filteredQuestions.map(question => question.id),
        currentQuestionIndex,
        correctCount,
        incorrectCount,
        ...extra
    };

    quizProgress = progress;

    try {
        localStorage.setItem('quiz_progress', JSON.stringify(progress));
    } catch (e) {}
    updateResumeButtonVisibility();
}

function clearQuizProgress() {
    quizProgress = null;
    try {
        localStorage.removeItem('quiz_progress');
    } catch (e) {}
    updateResumeButtonVisibility();
}

function clearStatistics() {
    incorrectIdsBySubject = {};
    saveIncorrectIds(incorrectIdsBySubject);
    clearQuizProgress();

    const practiceBtn = document.getElementById('practice-incorrect-btn');
    practiceBtn.style.display = 'none';
    practiceBtn.textContent = 'Practice Incorrect [0]';
}

function updateResumeButtonVisibility() {
    const resumeBtn = document.getElementById('resume-progress-btn');
    const selectedSubject = document.getElementById('subject-select').value;
    const selectedProgress = getQuizProgress();

    if (!selectedSubject || !selectedProgress) {
        resumeBtn.style.display = 'none';
        return;
    }

    if (selectedProgress.subject !== selectedSubject) {
        resumeBtn.style.display = 'none';
        return;
    }

    resumeBtn.textContent = `Resume ${selectedProgress.subject} Session`;
    resumeBtn.style.display = 'inline-block';
}

function getIncorrectIds() {
    try {
        return JSON.parse(localStorage.getItem('quiz_incorrect_ids')) || {};
    } catch(e) {
        return {};
    }
}

function saveIncorrectIds(data) {
    try {
        localStorage.setItem('quiz_incorrect_ids', JSON.stringify(data));
    } catch(e) {}
}

let incorrectIdsBySubject = getIncorrectIds();
quizProgress = getQuizProgress();

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
        const lastSubject = localStorage.getItem('last_subject');
        if (lastSubject && subjects.includes(lastSubject)) {
            select.value = lastSubject;
            select.dispatchEvent(new Event('change'));
        }

        updateResumeButtonVisibility();
    } catch (error) {
        document.getElementById('setup-error').textContent = 'Error: Create subjects.json file with subject folder names.';
    }
}

function getFilteredCount(category) {
    if (category === 'All') return allQuestions.length;
    if (category === 'Type: Single Choice') return allQuestions.filter(q => q.questionType === 1).length;
    if (category === 'Type: Multiple Choice') return allQuestions.filter(q => q.questionType === 2).length;
    if (category === 'Type: Text Input') return allQuestions.filter(q => q.questionType === 3).length;
    return allQuestions.filter(q => q.section === category).length;
}

function updateQuestionCountDisplay() {
    if (allQuestions.length === 0) {
        document.getElementById('question-count-display').textContent = '';
        return;
    }
    const selectedCategory = document.getElementById('category-select').value;
    const count = getFilteredCount(selectedCategory);
    
    document.getElementById('question-count-display').textContent = `Total questions: ${count}`;
}

document.getElementById('category-select').addEventListener('change', updateQuestionCountDisplay);

document.getElementById('subject-select').addEventListener('change', async (event) => {
    const subject = event.target.value;
    const practiceBtn = document.getElementById('practice-incorrect-btn');
    
    practiceBtn.style.display = 'none';

    if (!subject) {
        document.getElementById('category-select').disabled = true;
        document.getElementById('start-btn').disabled = true;
        document.getElementById('open-editor-btn').disabled = true;
        document.getElementById('question-count-display').textContent = '';
        return;
    }

    localStorage.setItem('last_subject', subject);
    document.getElementById('setup-error').textContent = 'Loading...';
    document.getElementById('category-select').disabled = true;
    document.getElementById('start-btn').disabled = true;
    document.getElementById('open-editor-btn').disabled = true;
    document.getElementById('question-count-display').textContent = '';
    allQuestions = [];
    
    try {
        const path = `questions/${subject}/questions.json`;
        const res = await fetch(path);
        if (res.ok) {
            const data = await res.json();
            currentQuestionsJson = JSON.stringify(data, null, 2);
            allQuestions = data.questions || [];
        }
    } catch (e) {
    }
    
    if (allQuestions.length === 0) {
        document.getElementById('setup-error').textContent = `No questions found in questions/${subject}/questions.json`;
        return;
    }

    if (incorrectIdsBySubject[subject] && incorrectIdsBySubject[subject].length > 0) {
        incorrectIdsBySubject[subject] = incorrectIdsBySubject[subject].filter(id => allQuestions.some(q => q.id === id));
        saveIncorrectIds(incorrectIdsBySubject);
        
        if (incorrectIdsBySubject[subject].length > 0) {
            practiceBtn.style.display = 'inline-block';
            practiceBtn.textContent = `Practice Incorrect [${incorrectIdsBySubject[subject].length}]`;
        }
    }

    document.getElementById('setup-error').textContent = '';
    setupCategories();
    document.getElementById('category-select').disabled = false;
    document.getElementById('start-btn').disabled = false;
    document.getElementById('open-editor-btn').disabled = false;
    updateQuestionCountDisplay();
        updateResumeButtonVisibility();
});

document.getElementById('open-editor-btn').addEventListener('click', () => {
    const subject = document.getElementById('subject-select').value;
    if (!subject) return;
    window.open(`editor.html?subject=${encodeURIComponent(subject)}`, '_blank');
});

document.getElementById('quiz-open-editor-btn').addEventListener('click', () => {
    const subject = document.getElementById('subject-select').value;
    if (!subject) return;
    
    let url = `editor.html?subject=${encodeURIComponent(subject)}`;
    
    if (filteredQuestions && filteredQuestions.length > 0 && currentQuestionIndex < filteredQuestions.length) {
        const currentQ = filteredQuestions[currentQuestionIndex];
        if (currentQ && currentQ.id) {
            url += `&scrollId=${encodeURIComponent(currentQ.id)}`;
        }
    }
    
    window.open(url, '_blank');
});

function setupCategories() {
    const categories = [...new Set(allQuestions.map(q => q.section).filter(Boolean))];
    const select = document.getElementById('category-select');
    select.innerHTML = '<option value="All">All Categories</option>';
    
    categories.forEach(cat => {
        const count = allQuestions.filter(q => q.section === cat).length;
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = `Category ${cat} [${count}]`;
        select.appendChild(option);
    });

    const singleCount = allQuestions.filter(q => q.questionType === 1).length;
    if (singleCount > 0) {
        const opt = document.createElement('option');
        opt.value = 'Type: Single Choice';
        opt.textContent = `Single Choice Only [${singleCount}]`;
        select.appendChild(opt);
    }

    const multiCount = allQuestions.filter(q => q.questionType === 2).length;
    if (multiCount > 0) {
        const opt = document.createElement('option');
        opt.value = 'Type: Multiple Choice';
        opt.textContent = `Multiple Choice Only [${multiCount}]`;
        select.appendChild(opt);
    }

    const textCount = allQuestions.filter(q => q.questionType === 3).length;
    if (textCount > 0) {
        const opt = document.createElement('option');
        opt.value = 'Type: Text Input';
        opt.textContent = `Text Input Only [${textCount}]`;
        select.appendChild(opt);
    }
}

document.getElementById('start-btn').addEventListener('click', () => {
    const selectedCategory = document.getElementById('category-select').value;
    
    if (selectedCategory === 'All') {
        filteredQuestions = [...allQuestions];
    } else if (selectedCategory === 'Type: Single Choice') {
        filteredQuestions = allQuestions.filter(q => q.questionType === 1);
    } else if (selectedCategory === 'Type: Multiple Choice') {
        filteredQuestions = allQuestions.filter(q => q.questionType === 2);
    } else if (selectedCategory === 'Type: Text Input') {
        filteredQuestions = allQuestions.filter(q => q.questionType === 3);
    } else {
        filteredQuestions = allQuestions.filter(q => q.section === selectedCategory);
    }
    
    startQuizFlow();
});

document.getElementById('resume-progress-btn').addEventListener('click', () => {
    const progress = getQuizProgress();
    if (!progress) return;
    resumeQuizFlow(progress);
});

document.getElementById('clear-stats-btn').addEventListener('click', () => {
    clearStatistics();
});

document.getElementById('practice-incorrect-btn').addEventListener('click', () => {
    const subject = document.getElementById('subject-select').value;
    if (!subject || !incorrectIdsBySubject[subject]) return;
    
    filteredQuestions = allQuestions.filter(q => incorrectIdsBySubject[subject].includes(q.id));
    clearQuizProgress();
    startQuizFlow();
});

function startQuizFlow() {
    clearQuizProgress();
    studyMode = document.getElementById('study-mode').checked;

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
    saveQuizProgress();
    showQuestion();
}

function resumeQuizFlow(progress) {
    const subject = document.getElementById('subject-select').value;
    if (!subject || progress.subject !== subject) return;

    const categorySelect = document.getElementById('category-select');
    categorySelect.value = progress.category || 'All';
    document.getElementById('shuffle-questions').checked = !!progress.shuffleQuestions;
    document.getElementById('shuffle-options').checked = !!progress.shuffleOptions;
    document.getElementById('study-mode').checked = !!progress.studyMode;

    studyMode = !!progress.studyMode;

    const questionIds = Array.isArray(progress.questionIds) ? progress.questionIds : [];
    filteredQuestions = questionIds
        .map(questionId => allQuestions.find(question => question.id === questionId))
        .filter(Boolean);

    if (filteredQuestions.length === 0) return;

    const resumeOffset = progress.pendingAdvance ? 1 : 0;
    currentQuestionIndex = Math.min((progress.currentQuestionIndex || 0) + resumeOffset, filteredQuestions.length - 1);
    correctCount = progress.correctCount || 0;
    incorrectCount = progress.incorrectCount || 0;
    incorrectQuestions = [];

    document.getElementById('setup-container').style.display = 'none';
    document.getElementById('quiz-container').style.display = 'block';

    updateRetryButtonsVisibility();
    saveQuizProgress();
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
    
    const subject = document.getElementById('subject-select').value;
    const practiceBtn = document.getElementById('practice-incorrect-btn');
    
    if (incorrectIdsBySubject[subject] && incorrectIdsBySubject[subject].length > 0) {
        practiceBtn.style.display = 'inline-block';
        practiceBtn.textContent = `Practice Incorrect [${incorrectIdsBySubject[subject].length}]`;
    } else {
        practiceBtn.style.display = 'none';
    }

    saveQuizProgress({ pendingAdvance: document.getElementById('submit-btn').style.display === 'none' });
});

function updateProgressDisplay() {
    if (currentQuestionIndex >= filteredQuestions.length) return;
    const progressText = `${currentQuestionIndex + 1} / ${filteredQuestions.length}`;

    if (studyMode) {
        document.getElementById('progress-text').textContent = `Study Mode | ${progressText}`;
        return;
    }

    document.getElementById('progress-text').innerHTML = `
        <span class="score-green">${correctCount}</span> / <span class="score-red">${incorrectCount}</span>
        <span class="score-divider">|</span>
        ${progressText}
    `;
}

function updateRetryButtonsVisibility() {
    if (studyMode) {
        document.getElementById('retry-btn').style.display = 'none';
        return;
    }

    if (incorrectCount > 0) {
        document.getElementById('retry-btn').style.display = 'inline-block';
    } else {
        document.getElementById('retry-btn').style.display = 'none';
    }
}

function showQuestion() {
    document.getElementById('result-area').innerHTML = '';
    document.getElementById('submit-btn').style.display = studyMode ? 'none' : 'inline-block';
    document.getElementById('next-btn').style.display = studyMode ? 'inline-block' : 'none';
    document.getElementById('prev-btn').style.display = currentQuestionIndex > 0 ? 'inline-block' : 'none';
    
    updateRetryButtonsVisibility();
    
    if (currentQuestionIndex >= filteredQuestions.length) {
        document.getElementById('question-text').innerHTML = studyMode ? '<h2>Study Mode Finished</h2>' : '<h2>Quiz Finished!</h2>';
        document.getElementById('input-container').innerHTML = '';
        document.getElementById('submit-btn').style.display = 'none';
        document.getElementById('next-btn').style.display = 'none';
        document.getElementById('prev-btn').style.display = 'none';
        document.getElementById('category-letter').textContent = '';
        document.getElementById('category-topic').textContent = '';
        document.getElementById('question-filename').textContent = '';
        
        document.getElementById('progress-text').innerHTML = studyMode
            ? 'Study Mode'
            : `<span class="score-green">${correctCount}</span> / <span class="score-red">${incorrectCount}</span>`;
        clearQuizProgress();
        return;
    }

    const q = filteredQuestions[currentQuestionIndex];
    currentQuestionType = q.questionType;

    updateProgressDisplay();
    document.getElementById('category-letter').textContent = q.section || '';
    document.getElementById('category-topic').textContent = q.topic || '';
    document.getElementById('question-filename').textContent = q.id || '';
    document.getElementById('question-text').textContent = `${q.question} [${q.points} points]`;

    const inputContainer = document.getElementById('input-container');
    inputContainer.innerHTML = '';

    if (studyMode) {
        const hint = document.createElement('div');
        hint.className = 'study-answer-box';

        if (currentQuestionType === 1 || currentQuestionType === 2) {
            const correctAnswers = q.answers.filter(a => a.correct).map(a => a.text);
            const label = document.createElement('div');
            label.className = 'study-answer-label';
            label.textContent = correctAnswers.length > 1 ? 'Correct answers:' : 'Correct answer:';

            const value = document.createElement('div');
            value.className = 'study-answer-value';
            value.textContent = correctAnswers.join(', ');

            hint.appendChild(label);
            hint.appendChild(value);
        } else {
            const correctAnswer = q.answers[0] ? q.answers[0].text : '';
            const label = document.createElement('div');
            label.className = 'study-answer-label';
            label.textContent = 'Correct answer:';

            const value = document.createElement('div');
            value.className = 'study-answer-value';
            value.textContent = correctAnswer;

            hint.appendChild(label);
            hint.appendChild(value);
        }

        inputContainer.appendChild(hint);
        document.getElementById('result-area').innerHTML = '<span class="study-mode-note">Study Mode active: Only the correct answers are shown.</span>';
        saveQuizProgress({ pendingAdvance: false });
        return;
    }

    if (currentQuestionType === 1 || currentQuestionType === 2) {
        const inputType = currentQuestionType === 1 ? 'radio' : 'checkbox';
        
        let displayOptions = [...q.answers];
        if (document.getElementById('shuffle-options').checked) {
            displayOptions.sort(() => Math.random() - 0.5);
        }
        
        displayOptions.forEach((opt) => {
            const label = document.createElement('label');
            label.className = 'option-label';
            if (studyMode && opt.correct) {
                label.classList.add('study-correct-choice');
            }
            const input = document.createElement('input');
            input.type = inputType;
            input.name = 'quiz-option';
            input.value = opt.text;
            if (studyMode) {
                input.disabled = true;
            }
            label.appendChild(input);
            label.appendChild(document.createTextNode(opt.text));
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
    if (studyMode) return;

    const q = filteredQuestions[currentQuestionIndex];
    const resultArea = document.getElementById('result-area');
    const subject = document.getElementById('subject-select').value;
    let isCorrect = false;
    let feedback = '';

    if (currentQuestionType === 1) {
        const selected = document.querySelector('input[name="quiz-option"]:checked');
        const correctAnswerObj = q.answers.find(a => a.correct);
        const correctAnswer = correctAnswerObj ? correctAnswerObj.text : '';
        
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
    } else if (currentQuestionType === 2) {
        const selectedElements = Array.from(document.querySelectorAll('input[name="quiz-option"]:checked'));
        const selected = selectedElements.map(el => el.value);
        const correctAnswers = q.answers.filter(a => a.correct).map(a => a.text);
        
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
        const correctAnswer = q.answers[0].text;
        const sim = calculateSimilarity(textVal, correctAnswer);
        
        isCorrect = sim >= 80;
        feedback = `Similarity: <strong>${sim.toFixed(1)}%</strong><br><br>Your answer: ${textVal}<br>The correct answer is: ${correctAnswer}`;
    }

    if (isCorrect) {
        correctCount++;
        if (incorrectIdsBySubject[subject]) {
            incorrectIdsBySubject[subject] = incorrectIdsBySubject[subject].filter(id => id !== q.id);
            saveIncorrectIds(incorrectIdsBySubject);
        }
    } else {
        incorrectCount++;
        if (!incorrectQuestions.includes(q)) {
            incorrectQuestions.push(q);
        }
        if (!incorrectIdsBySubject[subject]) {
            incorrectIdsBySubject[subject] = [];
        }
        if (!incorrectIdsBySubject[subject].includes(q.id)) {
            incorrectIdsBySubject[subject].push(q.id);
            saveIncorrectIds(incorrectIdsBySubject);
        }
    }

    updateProgressDisplay();
    updateRetryButtonsVisibility();
    resultArea.innerHTML = feedback;
    document.getElementById('submit-btn').style.display = 'none';
    document.getElementById('next-btn').style.display = 'inline-block';
    saveQuizProgress({ pendingAdvance: true });
});

document.getElementById('next-btn').addEventListener('click', () => {
    currentQuestionIndex++;
    saveQuizProgress({ pendingAdvance: false });
    showQuestion();
});

document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        saveQuizProgress({ pendingAdvance: false });
        showQuestion();
    }
});

window.updateQuizData = function(jsonString) {
    try {
        currentQuestionsJson = jsonString;

        const data = JSON.parse(jsonString);
        allQuestions = data.questions || [];
        
        if (document.getElementById('setup-container').style.display !== 'none') {
            setupCategories();
            updateQuestionCountDisplay();
        } else {
            for (let i = 0; i < filteredQuestions.length; i++) {
                const updatedQ = allQuestions.find(q => q.id === filteredQuestions[i].id);
                if (updatedQ) {
                    filteredQuestions[i] = updatedQ;
                }
            }
            
            for (let i = 0; i < incorrectQuestions.length; i++) {
                const updatedQ = allQuestions.find(q => q.id === incorrectQuestions[i].id);
                if (updatedQ) {
                    incorrectQuestions[i] = updatedQ;
                }
            }
            
            if (currentQuestionIndex < filteredQuestions.length) {
                const q = filteredQuestions[currentQuestionIndex];
                
                if (document.getElementById('submit-btn').style.display === 'none' && document.getElementById('next-btn').style.display !== 'none') {
                    const resultHTML = document.getElementById('result-area').innerHTML;
                    if (resultHTML.includes('correct">Correct!')) {
                        correctCount = Math.max(0, correctCount - 1);
                    } else {
                        incorrectCount = Math.max(0, incorrectCount - 1);
                        incorrectQuestions = incorrectQuestions.filter(iq => iq.id !== q.id);
                        
                        const subject = document.getElementById('subject-select').value;
                        if (incorrectIdsBySubject[subject]) {
                            incorrectIdsBySubject[subject] = incorrectIdsBySubject[subject].filter(id => id !== q.id);
                            saveIncorrectIds(incorrectIdsBySubject);
                        }
                    }
                }
                
                showQuestion();
            }
        }
    } catch (e) {
    }
};

window.getCurrentQuestionsJson = function () {
    return currentQuestionsJson;
};

window.addEventListener('beforeunload', () => {
    if (document.getElementById('quiz-container').style.display !== 'none') {
        saveQuizProgress({ pendingAdvance: document.getElementById('submit-btn').style.display === 'none' });
    }
});

window.onload = init;