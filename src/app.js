import { store, storage } from './store.js';
import { getWordCount } from './utils.js';
import { setupCategories, updateQuestionCountDisplay, updateResumeButtonVisibility } from './menu.js';
import { startQuizFlow, resumeQuizFlow, showQuestion, submitAnswer } from './quiz.js';

const themeBtn = document.getElementById('theme-toggle-btn');
const savedTheme = localStorage.getItem('theme') || 'light';
if (savedTheme === 'dark') {
    themeBtn.textContent = '☀️';
} else {
    themeBtn.textContent = '🌙';
}

themeBtn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        themeBtn.textContent = '🌙';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        themeBtn.textContent = '☀️';
    }
});

document.getElementById('study-mode').addEventListener('change', (e) => {
    if (e.target.checked) {
        document.getElementById('exam-mode').checked = false;
        document.getElementById('exam-mode-info').style.display = 'none';
        document.getElementById('category-select').disabled = false;
        document.getElementById('shuffle-questions').disabled = false;
        document.getElementById('shuffle-options').disabled = false;
        document.getElementById('start-btn').textContent = 'Start New Quiz';
        document.getElementById('question-count-display').style.display = 'block';
        
        updateResumeButtonVisibility();
        const subject = document.getElementById('subject-select').value;
        if (subject && store.incorrectIdsBySubject[subject] && store.incorrectIdsBySubject[subject].length > 0) {
            document.getElementById('practice-incorrect-btn').style.display = 'inline-block';
        }
    }
});

document.getElementById('exam-mode').addEventListener('change', (e) => {
    const info = document.getElementById('exam-mode-info');
    const shuffleQs = document.getElementById('shuffle-questions');
    const shuffleOpts = document.getElementById('shuffle-options');
    const startBtn = document.getElementById('start-btn');
    const countDisplay = document.getElementById('question-count-display');
    const resumeBtn = document.getElementById('resume-progress-btn');
    const clearBtn = document.getElementById('clear-stats-btn');
    const practiceBtn = document.getElementById('practice-incorrect-btn');
    const subject = document.getElementById('subject-select').value;
    
    if (e.target.checked) {
        document.getElementById('study-mode').checked = false;
        info.style.display = 'block';
        document.getElementById('category-select').disabled = true;
        shuffleQs.disabled = true;
        shuffleOpts.disabled = true;
        startBtn.textContent = '🎓 Start Exam';
        countDisplay.style.display = 'none';
        
        resumeBtn.style.display = 'none';
        clearBtn.style.display = 'none';
        practiceBtn.style.display = 'none';
    } else {
        info.style.display = 'none';
        document.getElementById('category-select').disabled = false;
        shuffleQs.disabled = false;
        shuffleOpts.disabled = false;
        startBtn.textContent = 'Start New Quiz';
        countDisplay.style.display = 'block';
        
        updateResumeButtonVisibility();
        if (subject && store.incorrectIdsBySubject[subject] && store.incorrectIdsBySubject[subject].length > 0) {
            practiceBtn.style.display = 'inline-block';
        }
    }
});

async function init() {
    storage.load();
    try {
        const res = await fetch('questions/subjects.json');
        if (!res.ok) throw new Error('questions/subjects.json not found');
        const subjects = await res.json();
        
        const select = document.getElementById('subject-select');
        select.innerHTML = '<option value="">Select subject...</option>';
        subjects.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub.folder;
            opt.textContent = sub.name;
            select.appendChild(opt);
        });
        
        select.disabled = false;
        const lastSubject = localStorage.getItem('last_subject');
        if (lastSubject && subjects.some(s => s.folder === lastSubject)) {
            select.value = lastSubject;
            select.dispatchEvent(new Event('change'));
        }

        updateResumeButtonVisibility();
        
        if (document.getElementById('exam-mode').checked) {
            document.getElementById('resume-progress-btn').style.display = 'none';
            document.getElementById('clear-stats-btn').style.display = 'none';
            document.getElementById('practice-incorrect-btn').style.display = 'none';
        }
    } catch (error) {
        document.getElementById('setup-error').textContent = 'Error: Create subjects.json file with subject folder names.';
    }
}

document.getElementById('category-select').addEventListener('change', (event) => {
    localStorage.setItem('last_category', event.target.value);
    updateQuestionCountDisplay();
});

document.getElementById('subject-select').addEventListener('change', async (event) => {
    const subject = event.target.value;
    const practiceBtn = document.getElementById('practice-incorrect-btn');
    
    practiceBtn.style.display = 'none';

    if (!subject) {
        document.getElementById('category-select').disabled = true;
        document.getElementById('start-btn').disabled = true;
        document.getElementById('open-editor-btn').disabled = true;
        document.getElementById('question-count-display').textContent = '';
        updateResumeButtonVisibility();
        return;
    }

    localStorage.setItem('last_subject', subject);
    document.getElementById('setup-error').textContent = 'Loading...';
    document.getElementById('category-select').disabled = true;
    document.getElementById('start-btn').disabled = true;
    document.getElementById('open-editor-btn').disabled = true;
    document.getElementById('question-count-display').textContent = '';
    store.allQuestions = [];
    
    try {
        const path = `questions/${subject}/questions.json`;
        const res = await fetch(path);
        if (res.ok) {
            const data = await res.json();
            store.currentQuestionsJson = JSON.stringify(data, null, 2);
            store.allQuestions = data.questions || [];
        }
    } catch (e) {}

    if (store.allQuestions.length === 0) {
        document.getElementById('setup-error').textContent = `No questions found in questions/${subject}/questions.json`;
        updateResumeButtonVisibility();
        return;
    }

    if (store.incorrectIdsBySubject[subject] && store.incorrectIdsBySubject[subject].length > 0) {
        store.incorrectIdsBySubject[subject] = store.incorrectIdsBySubject[subject].filter(id => store.allQuestions.some(q => q.id === id));
        storage.saveIncorrect();
        
        if (store.incorrectIdsBySubject[subject].length > 0) {
            practiceBtn.style.display = 'inline-block';
            practiceBtn.textContent = `Practice Incorrect [${store.incorrectIdsBySubject[subject].length}]`;
        }
    }

    if (store.starredIdsBySubject[subject] && store.starredIdsBySubject[subject].length > 0) {
        store.starredIdsBySubject[subject] = store.starredIdsBySubject[subject].filter(id => store.allQuestions.some(q => q.id === id));
        storage.saveStarred();
    }

    document.getElementById('setup-error').textContent = '';
    setupCategories();
    
    if (!document.getElementById('exam-mode').checked) {
        document.getElementById('category-select').disabled = false;
    }
    
    document.getElementById('start-btn').disabled = false;
    document.getElementById('open-editor-btn').disabled = false;
    updateQuestionCountDisplay();
    updateResumeButtonVisibility();
    
    if (document.getElementById('exam-mode').checked) {
        document.getElementById('resume-progress-btn').style.display = 'none';
        document.getElementById('clear-stats-btn').style.display = 'none';
        practiceBtn.style.display = 'none';
    }
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
    
    if (store.filteredQuestions && store.filteredQuestions.length > 0 && store.currentQuestionIndex < store.filteredQuestions.length) {
        const currentQ = store.filteredQuestions[store.currentQuestionIndex];
        if (currentQ && currentQ.id) {
            url += `&scrollId=${encodeURIComponent(currentQ.id)}`;
        }
    }
    
    window.open(url, '_blank');
});

document.getElementById('star-container').addEventListener('click', () => {
    const subject = document.getElementById('subject-select').value;
    if (store.currentQuestionIndex >= store.filteredQuestions.length) return;
    
    const q = store.filteredQuestions[store.currentQuestionIndex];
    if (!q) return;

    if (!store.starredIdsBySubject[subject]) {
        store.starredIdsBySubject[subject] = [];
    }

    const starBtn = document.getElementById('star-btn');
    const idx = store.starredIdsBySubject[subject].indexOf(q.id);
    
    if (idx === -1) {
        store.starredIdsBySubject[subject].push(q.id);
        starBtn.textContent = '★';
        starBtn.classList.add('starred');
    } else {
        store.starredIdsBySubject[subject].splice(idx, 1);
        starBtn.textContent = '☆';
        starBtn.classList.remove('starred');
    }
    
    storage.saveStarred();
});

document.getElementById('start-btn').addEventListener('click', () => {
    if (!document.getElementById('exam-mode').checked) {
        const selectedCategory = document.getElementById('category-select').value;
        
        if (selectedCategory === 'All') {
            store.filteredQuestions = [...store.allQuestions];
        } else if (selectedCategory === 'Type: Single Choice') {
            store.filteredQuestions = store.allQuestions.filter(q => q.questionType === 1);
        } else if (selectedCategory === 'Type: Multiple Choice') {
            store.filteredQuestions = store.allQuestions.filter(q => q.questionType === 2);
        } else if (selectedCategory === 'Single+Multiple Choice') {
            store.filteredQuestions = store.allQuestions.filter(q => q.questionType === 1 || q.questionType === 2);
        } else if (selectedCategory === 'Type: Text Input') {
            store.filteredQuestions = store.allQuestions.filter(q => q.questionType === 3);
        } else if (selectedCategory === 'Short Text Questions') {
            store.filteredQuestions = store.allQuestions.filter(q => q.questionType === 3 && getWordCount(q.answers && q.answers.length > 0 ? q.answers[0].text : '') <= 3);
        } else if (selectedCategory === 'Long Text Questions') {
            store.filteredQuestions = store.allQuestions.filter(q => q.questionType === 3 && getWordCount(q.answers && q.answers.length > 0 ? q.answers[0].text : '') > 3);
        } else if (selectedCategory === 'Starred') {
            const subject = document.getElementById('subject-select').value;
            const starred = store.starredIdsBySubject[subject] || [];
            store.filteredQuestions = store.allQuestions.filter(q => starred.includes(q.id));
        } else {
            store.filteredQuestions = store.allQuestions.filter(q => q.section === selectedCategory);
        }
    }
    
    store.answeredQuestions = {};
    startQuizFlow();
});

document.getElementById('resume-progress-btn').addEventListener('click', () => {
    if (!store.quizProgress) return;
    resumeQuizFlow(store.quizProgress);
});

document.getElementById('clear-stats-btn').addEventListener('click', () => {
    store.incorrectIdsBySubject = {};
    storage.saveIncorrect();
    storage.clearProgress();
    const practiceBtn = document.getElementById('practice-incorrect-btn');
    practiceBtn.style.display = 'none';
    practiceBtn.textContent = 'Practice Incorrect [0]';
    updateResumeButtonVisibility();
    
    if (document.getElementById('exam-mode').checked) {
        document.getElementById('resume-progress-btn').style.display = 'none';
        document.getElementById('clear-stats-btn').style.display = 'none';
    }
});

document.getElementById('practice-incorrect-btn').addEventListener('click', () => {
    const subject = document.getElementById('subject-select').value;
    if (!subject || !store.incorrectIdsBySubject[subject]) return;
    
    store.filteredQuestions = store.allQuestions.filter(q => store.incorrectIdsBySubject[subject].includes(q.id));
    storage.clearProgress();
    store.answeredQuestions = {};
    
    document.getElementById('exam-mode').checked = false;
    document.getElementById('exam-mode-info').style.display = 'none';
    document.getElementById('category-select').disabled = false;
    document.getElementById('shuffle-questions').disabled = false;
    document.getElementById('shuffle-options').disabled = false;
    document.getElementById('start-btn').textContent = 'Start New Quiz';
    document.getElementById('question-count-display').style.display = 'block';
    
    startQuizFlow();
});

document.getElementById('submit-btn').addEventListener('click', () => {
    if (store.studyMode) return;
    submitAnswer();
});

document.getElementById('next-btn').addEventListener('click', () => {
    store.currentQuestionIndex++;
    storage.saveProgress({ pendingAdvance: false });
    showQuestion();
});

document.getElementById('prev-btn').addEventListener('click', () => {
    if (store.currentQuestionIndex > 0) {
        store.currentQuestionIndex--;
        storage.saveProgress({ pendingAdvance: false });
        showQuestion();
    }
});

document.getElementById('exit-btn').addEventListener('click', () => {
    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('setup-container').style.display = 'block';
    
    const subject = document.getElementById('subject-select').value;
    const practiceBtn = document.getElementById('practice-incorrect-btn');
    
    if (store.incorrectIdsBySubject[subject] && store.incorrectIdsBySubject[subject].length > 0) {
        practiceBtn.style.display = 'inline-block';
        practiceBtn.textContent = `Practice Incorrect [${store.incorrectIdsBySubject[subject].length}]`;
    } else {
        practiceBtn.style.display = 'none';
    }

    storage.saveProgress({ pendingAdvance: document.getElementById('submit-btn').style.display === 'none' });
    setupCategories(); 
    updateResumeButtonVisibility();
    
    if (document.getElementById('exam-mode').checked) {
        document.getElementById('resume-progress-btn').style.display = 'none';
        document.getElementById('clear-stats-btn').style.display = 'none';
        practiceBtn.style.display = 'none';
    }
});

window.updateQuizData = function(jsonString) {
    try {
        store.currentQuestionsJson = jsonString;

        const data = JSON.parse(jsonString);
        store.allQuestions = data.questions || [];
        
        if (document.getElementById('setup-container').style.display !== 'none') {
            setupCategories();
            updateQuestionCountDisplay();
        } else {
            for (let i = 0; i < store.filteredQuestions.length; i++) {
                const updatedQ = store.allQuestions.find(q => q.id === store.filteredQuestions[i].id);
                if (updatedQ) {
                    store.filteredQuestions[i] = updatedQ;
                }
            }
            
            for (let i = 0; i < store.incorrectQuestions.length; i++) {
                const updatedQ = store.allQuestions.find(q => q.id === store.incorrectQuestions[i].id);
                if (updatedQ) {
                    store.incorrectQuestions[i] = updatedQ;
                }
            }
            
            if (store.currentQuestionIndex < store.filteredQuestions.length) {
                const q = store.filteredQuestions[store.currentQuestionIndex];
                
                if (document.getElementById('submit-btn').style.display === 'none' && document.getElementById('next-btn').style.display !== 'none') {
                    const resultHTML = document.getElementById('result-area').innerHTML;
                    if (resultHTML.includes('correct">Correct!')) {
                        store.correctCount = Math.max(0, store.correctCount - 1);
                    } else {
                        store.incorrectCount = Math.max(0, store.incorrectCount - 1);
                        store.incorrectQuestions = store.incorrectQuestions.filter(iq => iq.id !== q.id);
                        
                        const subject = document.getElementById('subject-select').value;
                        if (store.incorrectIdsBySubject[subject]) {
                            store.incorrectIdsBySubject[subject] = store.incorrectIdsBySubject[subject].filter(id => id !== q.id);
                            storage.saveIncorrect();
                        }
                    }
                }
                showQuestion();
            }
        }
    } catch (e) {}
};

window.getCurrentQuestionsJson = function () {
    return store.currentQuestionsJson;
};

window.addEventListener('beforeunload', () => {
    if (document.getElementById('quiz-container').style.display !== 'none') {
        storage.saveProgress({ pendingAdvance: document.getElementById('submit-btn').style.display === 'none' });
    }
});

window.onload = init;