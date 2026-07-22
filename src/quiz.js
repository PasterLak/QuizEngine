import { store, storage } from './store.js';
import { calculateSimilarity } from './utils.js';

export function updateProgressDisplay() {
    if (store.currentQuestionIndex >= store.filteredQuestions.length) return;
    const progressText = `${store.currentQuestionIndex + 1} / ${store.filteredQuestions.length}`;

    if (store.studyMode) {
        document.getElementById('progress-text').textContent = `Study Mode | ${progressText}`;
        return;
    }

    document.getElementById('progress-text').innerHTML = `
        <span class="score-green">${store.correctCount}</span> / <span class="score-red">${store.incorrectCount}</span>
        <span class="score-divider">|</span>
        ${progressText}
    `;
}

export function showQuestion() {
    document.getElementById('result-area').innerHTML = '';
    document.getElementById('submit-btn').style.display = store.studyMode ? 'none' : 'inline-block';
    document.getElementById('next-btn').style.display = store.studyMode ? 'inline-block' : 'none';
    document.getElementById('prev-btn').style.display = store.currentQuestionIndex > 0 ? 'inline-block' : 'none';

    if (store.currentQuestionIndex >= store.filteredQuestions.length) {
        const percent = store.filteredQuestions.length === 0 
            ? 0 
            : Math.round((store.correctCount / store.filteredQuestions.length) * 100);

        let html = `
            <div style="text-align:center; margin-top:40px;">
                <h2 style="font-size:32px; margin-bottom:20px;">
                    ${store.studyMode ? 'Study Mode Finished' : 'Quiz Finished!'}
                </h2>
                <div style="font-size:48px; font-weight:bold; margin-bottom:20px;">
                    ${percent}%
                </div>
        `;

        if (!store.studyMode) {
            if (percent === 100) html += `<div style="font-size:22px; margin-top:20px;">Congratulations, all answers are correct! 🚀</div>`;
            else if (percent >= 80) html += `<div style="font-size:22px; margin-top:20px;">Great job, you got almost everything right! 🔥</div>`;
            else if (percent >= 60) html += `<div style="font-size:22px; margin-top:20px;">Good work, keep pushing and you'll master it! 💪</div>`;
            else if (percent >= 40) html += `<div style="font-size:22px; margin-top:20px;">Not bad, but there’s room for improvement. Keep practicing! 📘</div>`;
            else if (percent >= 20) html += `<div style="font-size:22px; margin-top:20px;">You’re getting started — keep going, you can do better! 🌱</div>`;
            else html += `<div style="font-size:22px; margin-top:20px;">Don’t give up — you can improve with practice! ⭐</div>`;
        }

        html += `</div>`;

        document.getElementById('question-text').innerHTML = html;
        document.getElementById('input-container').innerHTML = '';
        document.getElementById('submit-btn').style.display = 'none';
        document.getElementById('next-btn').style.display = 'none';
        document.getElementById('prev-btn').style.display = 'none';
        document.getElementById('category-letter').textContent = '';
        document.getElementById('category-topic').textContent = '';
        document.getElementById('question-filename').textContent = '';
        document.getElementById('star-container').style.display = 'none';

        document.getElementById('progress-text').innerHTML = store.studyMode
            ? 'Study Mode'
            : `<span class="score-green">${store.correctCount}</span> / <span class="score-red">${store.incorrectCount}</span>`;

        storage.clearProgress();
        return;
    }

    const q = store.filteredQuestions[store.currentQuestionIndex];
    store.currentQuestionType = q.questionType;
    const subject = document.getElementById('subject-select').value;
    const starBtn = document.getElementById('star-btn');
    const starContainer = document.getElementById('star-container');

    starContainer.style.display = 'flex';
    if (store.starredIdsBySubject[subject] && store.starredIdsBySubject[subject].includes(q.id)) {
        starBtn.textContent = '★';
        starBtn.classList.add('starred');
    } else {
        starBtn.textContent = '☆';
        starBtn.classList.remove('starred');
    }

    updateProgressDisplay();
    document.getElementById('category-letter').textContent = q.section || '';
    document.getElementById('category-topic').textContent = q.topic || '';
    document.getElementById('question-filename').textContent = q.id || '';
    document.getElementById('question-text').textContent = `${q.question} [${q.points} points]`;

    const inputContainer = document.getElementById('input-container');
    inputContainer.innerHTML = '';

    const wasAnswered = store.answeredQuestions[q.id];

    if (store.studyMode) {
        const hint = document.createElement('div');
        hint.className = 'study-answer-box';

        if (store.currentQuestionType === 1 || store.currentQuestionType === 2) {
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
        storage.saveProgress({ pendingAdvance: false });
        return;
    }

    if (wasAnswered) {
        document.getElementById('submit-btn').style.display = 'none';
        document.getElementById('next-btn').style.display = 'inline-block';

        if (wasAnswered.isCorrect) {
            document.getElementById('result-area').innerHTML = '<span class="correct">Correct!</span>';
        } else {
            const correctAnswer = q.answers[0].text;
            document.getElementById('result-area').innerHTML =
                `<span class="incorrect">Incorrect.</span><br><br>
                 Correct answer: ${correctAnswer}`;
        }
    }

    if (store.currentQuestionType === 1 || store.currentQuestionType === 2) {
        const inputType = store.currentQuestionType === 1 ? 'radio' : 'checkbox';
        
        let displayOptions = [...q.answers];
        if (document.getElementById('shuffle-options').checked && !wasAnswered) {
            displayOptions.sort(() => Math.random() - 0.5);
        }
        
        displayOptions.forEach((opt) => {
            const label = document.createElement('label');
            label.className = 'option-label';
            const input = document.createElement('input');
            input.type = inputType;
            input.name = 'quiz-option';
            input.value = opt.text;

            if (wasAnswered) {
                input.disabled = true;

                if (opt.correct) {
                    label.classList.add('correct-choice');
                }

                if (!opt.correct && wasAnswered.selected.includes(opt.text)) {
                    label.classList.add('incorrect-choice');
                }

                if (wasAnswered.selected.includes(opt.text)) {
                    input.checked = true;
                }
            }

            label.appendChild(input);
            label.appendChild(document.createTextNode(opt.text));
            inputContainer.appendChild(label);
        });
    } else {
        const textarea = document.createElement('textarea');
        textarea.id = 'text-answer';

        if (wasAnswered) {
            textarea.value = wasAnswered.selected || '';
            textarea.disabled = true;
        }

        inputContainer.appendChild(textarea);
    }
}

export function submitAnswer() {
    const q = store.filteredQuestions[store.currentQuestionIndex];
    const resultArea = document.getElementById('result-area');
    const subject = document.getElementById('subject-select').value;
    let isCorrect = false;
    let feedback = '';

    if (store.currentQuestionType === 1) {
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
    } else if (store.currentQuestionType === 2) {
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
        var c = isCorrect ? '<span class="correct">Correct!</span>' : `<span class="incorrect">Incorrect</span> | `;
        feedback = c + `Similarity: <strong>${sim.toFixed(1)}%</strong><br><br><u>The correct answer is: </u>${correctAnswer}`;
    }

    if (isCorrect) {
        store.correctCount++;
        if (store.incorrectIdsBySubject[subject]) {
            store.incorrectIdsBySubject[subject] = store.incorrectIdsBySubject[subject].filter(id => id !== q.id);
            storage.saveIncorrect();
        }
    } else {
        store.incorrectCount++;
        if (!store.incorrectQuestions.includes(q)) {
            store.incorrectQuestions.push(q);
        }
        if (!store.incorrectIdsBySubject[subject]) {
            store.incorrectIdsBySubject[subject] = [];
        }
        if (!store.incorrectIdsBySubject[subject].includes(q.id)) {
            store.incorrectIdsBySubject[subject].push(q.id);
            storage.saveIncorrect();
        }
    }

    const selectedValues = store.currentQuestionType === 3
        ? document.getElementById('text-answer').value.trim()
        : Array.from(document.querySelectorAll('input[name="quiz-option"]:checked')).map(el => el.value);

    store.answeredQuestions[q.id] = {
        isCorrect,
        selected: selectedValues
    };

    updateProgressDisplay();
    
    resultArea.innerHTML = feedback;
    document.getElementById('submit-btn').style.display = 'none';
    document.getElementById('next-btn').style.display = 'inline-block';
    storage.saveProgress({ pendingAdvance: true });
}

export function startQuizFlow() {
    storage.clearProgress();
    store.studyMode = document.getElementById('study-mode').checked;

    if (document.getElementById('shuffle-questions').checked) {
        store.filteredQuestions.sort(() => Math.random() - 0.5);
    }
    
    store.currentQuestionIndex = 0;
    store.correctCount = 0;
    store.incorrectCount = 0;
    store.incorrectQuestions = [];
    
    document.getElementById('setup-container').style.display = 'none';
    document.getElementById('quiz-container').style.display = 'block';
    
    storage.saveProgress();
    showQuestion();
}

export function resumeQuizFlow(progress) {
    const subject = document.getElementById('subject-select').value;
    if (!subject || progress.subject !== subject) return;

    const categorySelect = document.getElementById('category-select');
    categorySelect.value = progress.category || 'All';
    document.getElementById('shuffle-questions').checked = !!progress.shuffleQuestions;
    document.getElementById('shuffle-options').checked = !!progress.shuffleOptions;
    document.getElementById('study-mode').checked = !!progress.studyMode;

    store.studyMode = !!progress.studyMode;

    const questionIds = Array.isArray(progress.questionIds) ? progress.questionIds : [];
    store.filteredQuestions = questionIds
        .map(questionId => store.allQuestions.find(question => question.id === questionId))
        .filter(Boolean);

    if (store.filteredQuestions.length === 0) return;

    store.answeredQuestions = progress.answeredQuestions || {};

    const resumeOffset = progress.pendingAdvance ? 1 : 0;
    store.currentQuestionIndex = Math.min((progress.currentQuestionIndex || 0) + resumeOffset, store.filteredQuestions.length - 1);
    store.correctCount = progress.correctCount || 0;
    store.incorrectCount = progress.incorrectCount || 0;
    store.incorrectQuestions = [];

    document.getElementById('setup-container').style.display = 'none';
    document.getElementById('quiz-container').style.display = 'block';

    storage.saveProgress();
    showQuestion();
}