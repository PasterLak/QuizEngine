import { store, storage } from './store.js';
import { calculateSimilarity, getWordCount } from './utils.js';

function getQuestionPoints(q) {
    if (q.points !== undefined && q.points !== null) return Number(q.points);
    if (q.questionType === 1) return 1;
    if (q.questionType === 2) return 2;
    if (q.questionType === 3) return 5;
    return 1;
}

function renderTextFeedback(q) {
    const resultArea = document.getElementById('result-area');
    const ansState = store.answeredQuestions[q.id];
    const isCorrect = ansState.isCorrect;
    const textVal = ansState.selected || '';
    const correctAnswer = q.answers[0].text;
    const sim = calculateSimilarity(textVal, correctAnswer);
    
    let btnClass = isCorrect ? 'correct-override' : 'incorrect-override';
    let btnText = isCorrect ? 'Correct ✓' : 'Incorrect ✗';
    
    let html = `
        <div class="override-container">
            <button id="override-correctness-btn" class="override-btn ${btnClass}">
                ${btnText}
            </button>
            <span class="override-hint">Self-check: Click to override if auto-grading is wrong</span>
        </div>
        <div>Similarity: <strong>${sim.toFixed(1)}%</strong></div><br>
        <div><u>The correct answer is:</u><br>${correctAnswer}</div>
    `;
    
    resultArea.innerHTML = html;
    
    const overrideBtn = document.getElementById('override-correctness-btn');
    overrideBtn.addEventListener('click', () => {
        const subject = document.getElementById('subject-select').value;
        const wasCorrect = store.answeredQuestions[q.id].isCorrect;
        const isNowCorrect = !wasCorrect;
        
        store.answeredQuestions[q.id].isCorrect = isNowCorrect;
        
        if (isNowCorrect) {
            store.correctCount++;
            store.incorrectCount = Math.max(0, store.incorrectCount - 1);
            if (store.examMode) store.examEarnedPoints += getQuestionPoints(q);
            
            store.incorrectQuestions = store.incorrectQuestions.filter(iq => iq.id !== q.id);
            if (store.incorrectIdsBySubject[subject]) {
                store.incorrectIdsBySubject[subject] = store.incorrectIdsBySubject[subject].filter(id => id !== q.id);
            }
        } else {
            store.correctCount = Math.max(0, store.correctCount - 1);
            store.incorrectCount++;
            if (store.examMode) {
                store.examEarnedPoints = Math.max(0, store.examEarnedPoints - getQuestionPoints(q));
            }
            
            if (!store.incorrectQuestions.some(iq => iq.id === q.id)) {
                store.incorrectQuestions.push(q);
            }
            if (!store.incorrectIdsBySubject[subject]) store.incorrectIdsBySubject[subject] = [];
            if (!store.incorrectIdsBySubject[subject].includes(q.id)) {
                store.incorrectIdsBySubject[subject].push(q.id);
            }
        }
        
        storage.saveIncorrect();
        storage.saveProgress({ pendingAdvance: document.getElementById('submit-btn').style.display === 'none' });
        
        updateProgressDisplay();
        renderTextFeedback(q);
    });
}

export function updateProgressDisplay() {
    if (store.currentQuestionIndex >= store.filteredQuestions.length) return;
    const total = store.filteredQuestions.length;
    const progressText = `${store.currentQuestionIndex + 1} / ${total}`;

    const progressPercent = (store.currentQuestionIndex / total) * 100;
    const fill = document.getElementById('progress-bar-fill');
    if (fill) fill.style.width = `${progressPercent}%`;

    if (store.examMode) {
        document.getElementById('progress-text').innerHTML = `Exam: <span class="score-green">${store.examEarnedPoints}</span> / ${store.examTotalPoints} <span class="score-divider">|</span> ${progressText}`;
        return;
    }

    if (store.studyMode) {
        document.getElementById('progress-text').innerHTML = `Study Mode 📖 <span class="score-divider">|</span> ${progressText}`;
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
    
    document.getElementById('header').style.display = 'flex';
    
    const barContainer = document.getElementById('progress-bar-container');
    if (barContainer) barContainer.style.display = 'block';

    if (store.currentQuestionIndex >= store.filteredQuestions.length) {
        document.getElementById('header').style.display = 'none';
        
        const fill = document.getElementById('progress-bar-fill');
        if (fill) fill.style.width = `100%`;
        if (barContainer) barContainer.style.display = 'none';

        let html = '';
        
        if (store.examMode) {
            const passed = store.examEarnedPoints >= 50;
            const resultColor = passed ? '#4CAF50' : '#f44336';
            const resultText = passed ? 'Passed! 🎉' : 'Failed 😢';
            
            html = `
                <div style="text-align:center; margin-top:40px;">
                    <h2 style="font-size:32px; margin-bottom:20px;">Exam Finished!</h2>
                    <div style="font-size:48px; font-weight:bold; margin-bottom:10px; color: ${resultColor};">
                        ${resultText}
                    </div>
                    <div style="font-size:24px; margin-bottom:20px;">
                        Score: <strong>${store.examEarnedPoints} / ${store.examTotalPoints}</strong>
                    </div>
                    <div style="font-size:18px; margin-top:20px; color: var(--text-muted);">
                        ${passed ? 'Great job, you have enough points to pass the exam!' : 'You need at least 50 points to pass. Keep practicing!'}
                    </div>
                </div>
            `;
        } else {
            const percent = store.filteredQuestions.length === 0 
                ? 0 
                : Math.round((store.correctCount / store.filteredQuestions.length) * 100);

            html = `
                <div style="text-align:center; margin-top:40px;">
                    <h2 style="font-size:32px; margin-bottom:20px;">
                        ${store.studyMode ? 'Study Mode Finished 📖' : 'Quiz Finished!'}
                    </h2>
            `;

            if (!store.studyMode) {
                html += `
                    <div style="font-size:48px; font-weight:bold; margin-bottom:20px;">
                        ${percent}%
                    </div>
                `;
                if (percent === 100) html += `<div style="font-size:22px; margin-top:20px;">Congratulations, all answers are correct! 🚀</div>`;
                else if (percent >= 80) html += `<div style="font-size:22px; margin-top:20px;">Great job, you got almost everything right! 🔥</div>`;
                else if (percent >= 60) html += `<div style="font-size:22px; margin-top:20px;">Good work, keep pushing and you'll master it! 💪</div>`;
                else if (percent >= 40) html += `<div style="font-size:22px; margin-top:20px;">Not bad, but there’s room for improvement. Keep practicing! 📘</div>`;
                else if (percent >= 20) html += `<div style="font-size:22px; margin-top:20px;">You’re getting started — keep going, you can do better! 🌱</div>`;
                else html += `<div style="font-size:22px; margin-top:20px;">Don’t give up — you can improve with practice! ⭐</div>`;
            }

            html += `</div>`;
        }

        document.getElementById('question-text').innerHTML = html;
        document.getElementById('input-container').innerHTML = '';
        document.getElementById('submit-btn').style.display = 'none';
        document.getElementById('next-btn').style.display = 'none';
        document.getElementById('prev-btn').style.display = 'none';
        document.getElementById('category-letter').textContent = '';
        document.getElementById('category-topic').textContent = '';
        document.getElementById('question-filename').textContent = '';
        document.getElementById('star-container').style.display = 'none';
        
        const pointsEl = document.getElementById('question-points');
        if (pointsEl) pointsEl.style.display = 'none';

        if (store.examMode) {
            document.getElementById('progress-text').innerHTML = `Exam: <span class="score-green">${store.examEarnedPoints}</span> / ${store.examTotalPoints}`;
        } else {
            document.getElementById('progress-text').innerHTML = store.studyMode
                ? `Study Mode 📖`
                : `<span class="score-green">${store.correctCount}</span> / <span class="score-red">${store.incorrectCount}</span>`;
        }

        if (!store.studyMode && store.incorrectQuestions.length > 0) {
            document.getElementById('quiz-open-editor-btn').style.display = 'none';
            const repeatBtn = document.getElementById('repeat-incorrect-btn');
            repeatBtn.style.display = 'inline-block';
            repeatBtn.textContent = `🔁 Repeat Incorrect [${store.incorrectQuestions.length}]`;
        } else {
            document.getElementById('quiz-open-editor-btn').style.display = 'inline-block';
            document.getElementById('repeat-incorrect-btn').style.display = 'none';
        }

        storage.clearProgress();
        return;
    }

    document.getElementById('quiz-open-editor-btn').style.display = 'inline-block';
    document.getElementById('repeat-incorrect-btn').style.display = 'none';

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
    document.getElementById('question-text').textContent = q.question;
    
    const pointsEl = document.getElementById('question-points');
    if (pointsEl) {
        const pts = getQuestionPoints(q);
        pointsEl.textContent = `${pts} pts`;
        pointsEl.style.display = 'inline-block';
    }

    const inputContainer = document.getElementById('input-container');
    inputContainer.innerHTML = '';

    const wasAnswered = store.answeredQuestions[q.id];

    if (store.studyMode) {
        document.getElementById('result-area').innerHTML = '<span class="study-mode-note">Study Mode active 📖: Only the correct answers are shown.</span>';
        storage.saveProgress({ pendingAdvance: false });
    } else if (wasAnswered) {
        document.getElementById('submit-btn').style.display = 'none';
        document.getElementById('next-btn').style.display = 'inline-block';

        if (store.currentQuestionType === 3) {
            renderTextFeedback(q);
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

            if (store.studyMode) {
                input.disabled = true;
                if (opt.correct) {
                    label.classList.add('correct-choice');
                    input.checked = true;
                }
            } else if (wasAnswered) {
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

        if (store.studyMode) {
            textarea.value = q.answers[0] ? q.answers[0].text : '';
            textarea.disabled = true;
        } else if (wasAnswered) {
            textarea.value = wasAnswered.selected || '';
            textarea.disabled = true;
        }

        inputContainer.appendChild(textarea);

        if (!textarea.disabled) {
            setTimeout(() => {
                const ta = document.getElementById('text-answer');
                if (ta) ta.focus();
            }, 50);
        }
    }
}

export function submitAnswer() {
    const q = store.filteredQuestions[store.currentQuestionIndex];
    const resultArea = document.getElementById('result-area');
    const subject = document.getElementById('subject-select').value;
    let isCorrect = false;

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
    } else {
        const textVal = document.getElementById('text-answer').value;
        const correctAnswer = q.answers[0].text;
        const sim = calculateSimilarity(textVal, correctAnswer);
        
        isCorrect = sim >= 80;
    }

    if (isCorrect) {
        store.correctCount++;
        if (store.examMode) {
            store.examEarnedPoints += getQuestionPoints(q);
        }
        if (store.incorrectIdsBySubject[subject]) {
            store.incorrectIdsBySubject[subject] = store.incorrectIdsBySubject[subject].filter(id => id !== q.id);
            storage.saveIncorrect();
        }
    } else {
        if (store.examMode && store.currentQuestionType === 2) {
            const selectedElements = Array.from(document.querySelectorAll('input[name="quiz-option"]:checked'));
            const selected = selectedElements.map(el => el.value);
            const correctAnswers = q.answers.filter(a => a.correct).map(a => a.text);
            const correctSelected = selected.filter(val => correctAnswers.includes(val)).length;
            const incorrectSelected = selected.filter(val => !correctAnswers.includes(val)).length;
            const earned = Math.min(getQuestionPoints(q), Math.max(0, correctSelected - incorrectSelected));
            if (earned > 0) {
                store.examEarnedPoints += earned;
            }
        }

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
    
    if (store.currentQuestionType === 3) {
        renderTextFeedback(q);
    } else {
        resultArea.innerHTML = '';
    }
    
    document.getElementById('submit-btn').style.display = 'none';
    document.getElementById('next-btn').style.display = 'inline-block';
    
    document.querySelectorAll('input[name="quiz-option"]').forEach(input => {
        input.disabled = true;
    });
    const textAnswer = document.getElementById('text-answer');
    if (textAnswer) textAnswer.disabled = true;

    storage.saveProgress({ pendingAdvance: true });
}

export function startQuizFlow() {
    storage.clearProgress();
    store.studyMode = document.getElementById('study-mode').checked;
    store.examMode = document.getElementById('exam-mode').checked;
    
    store.examEarnedPoints = 0;
    store.examTotalPoints = 0;

    if (store.examMode) {
        let choiceQs = store.allQuestions.filter(q => q.questionType === 1 || q.questionType === 2).sort(() => Math.random() - 0.5);
        
        let shortTextQs = store.allQuestions.filter(q => q.questionType === 3 && getWordCount(q.answers && q.answers.length > 0 ? q.answers[0].text : '') <= 4).sort(() => Math.random() - 0.5);
        let longTextQs = store.allQuestions.filter(q => q.questionType === 3 && getWordCount(q.answers && q.answers.length > 0 ? q.answers[0].text : '') > 4).sort(() => Math.random() - 0.5);
        
        let textQs = [];
        let shortIdx = 0;
        let longIdx = 0;
        while(shortIdx < shortTextQs.length || longIdx < longTextQs.length) {
            if (shortIdx < shortTextQs.length) textQs.push(shortTextQs[shortIdx++]);
            if (longIdx < longTextQs.length) textQs.push(longTextQs[longIdx++]);
        }
        
        let selectedForExam = [];
        let totalPoints = 0;
        let choicePoints = 0;
        
        for (let q of choiceQs) {
            let pts = getQuestionPoints(q);
            if (choicePoints + pts <= 45 && totalPoints + pts <= 100) {
                selectedForExam.push(q);
                choicePoints += pts;
                totalPoints += pts;
            }
        }
        
        for (let q of textQs) {
            let pts = getQuestionPoints(q);
            if (totalPoints + pts <= 100) {
                selectedForExam.push(q);
                totalPoints += pts;
            }
        }
        
        let remainingQs = store.allQuestions.filter(q => !selectedForExam.includes(q)).sort(() => Math.random() - 0.5);
        for (let q of remainingQs) {
            let pts = getQuestionPoints(q);
            if (totalPoints + pts <= 100) {
                selectedForExam.push(q);
                totalPoints += pts;
            }
            if (totalPoints === 100) break;
        }

        store.filteredQuestions = selectedForExam.sort(() => Math.random() - 0.5);
        store.examTotalPoints = totalPoints;
    } else if (document.getElementById('shuffle-questions').checked) {
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

export function startRepeatIncorrectFlow() {
    if (!store.incorrectQuestions || store.incorrectQuestions.length === 0) return;
    
    storage.clearProgress();
    store.filteredQuestions = [...store.incorrectQuestions];
    store.studyMode = document.getElementById('study-mode').checked;
    
    store.examMode = false;
    document.getElementById('exam-mode').checked = false;
    
    if (document.getElementById('shuffle-questions').checked) {
        store.filteredQuestions.sort(() => Math.random() - 0.5);
    }
    
    store.currentQuestionIndex = 0;
    store.correctCount = 0;
    store.incorrectCount = 0;
    store.incorrectQuestions = [];
    store.answeredQuestions = {};
    
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
    
    store.studyMode = !!progress.studyMode;
    document.getElementById('study-mode').checked = store.studyMode;
    
    store.examMode = !!progress.examMode;
    document.getElementById('exam-mode').checked = store.examMode;
    
    const info = document.getElementById('exam-mode-info');
    const infoStudy = document.getElementById('study-mode-info');
    const countDisplay = document.getElementById('question-count-display');
    const startBtn = document.getElementById('start-btn');
    
    if (store.examMode) {
        info.style.display = 'block';
        infoStudy.style.display = 'none';
        document.getElementById('category-select').disabled = true;
        document.getElementById('shuffle-questions').disabled = true;
        document.getElementById('shuffle-options').disabled = true;
        startBtn.textContent = 'Start Exam 🎓';
        countDisplay.style.display = 'none';
    } else if (store.studyMode) {
        info.style.display = 'none';
        infoStudy.style.display = 'block';
        document.getElementById('category-select').disabled = false;
        document.getElementById('shuffle-questions').disabled = false;
        document.getElementById('shuffle-options').disabled = false;
        startBtn.textContent = 'Start New Quiz';
        countDisplay.style.display = 'block';
    } else {
        info.style.display = 'none';
        infoStudy.style.display = 'none';
        document.getElementById('category-select').disabled = false;
        document.getElementById('shuffle-questions').disabled = false;
        document.getElementById('shuffle-options').disabled = false;
        startBtn.textContent = 'Start New Quiz';
        countDisplay.style.display = 'block';
    }
    
    store.examEarnedPoints = progress.examEarnedPoints || 0;
    store.examTotalPoints = progress.examTotalPoints || 0;

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