import { store } from './store.js';
import { getWordCount } from './utils.js';

const SHORT_WORD_LIMIT = 5;

export function getQuestionsByCategory(category) {
    if (category === 'All') return [...store.allQuestions];
    if (category === 'Type: Single Choice') return store.allQuestions.filter(q => q.questionType === 1);
    if (category === 'Type: Multiple Choice') return store.allQuestions.filter(q => q.questionType === 2);
    if (category === 'Single+Multiple Choice') return store.allQuestions.filter(q => q.questionType === 1 || q.questionType === 2);
    if (category === 'Type: Text Input') return store.allQuestions.filter(q => q.questionType === 3);
    if (category === 'Short Text Questions') return store.allQuestions.filter(q => q.questionType === 3 && getWordCount(q.answers && q.answers.length > 0 ? q.answers[0].text : '') <= SHORT_WORD_LIMIT);
    if (category === 'Long Text Questions') return store.allQuestions.filter(q => q.questionType === 3 && getWordCount(q.answers && q.answers.length > 0 ? q.answers[0].text : '') > SHORT_WORD_LIMIT);
    if (category === 'Starred') {
        const subject = document.getElementById('subject-select').value;
        const starred = store.starredIdsBySubject[subject] || [];
        return store.allQuestions.filter(q => starred.includes(q.id));
    }
    return store.allQuestions.filter(q => q.section === category);
}

export function updateResumeButtonVisibility() {
    const resumeBtn = document.getElementById('resume-progress-btn');
    const clearStatsBtn = document.getElementById('clear-stats-btn');
    const selectedSubject = document.getElementById('subject-select').value;

    let hasProgress = selectedSubject && store.quizProgress && store.quizProgress.subject === selectedSubject;
    let hasIncorrectStats = selectedSubject && store.incorrectIdsBySubject[selectedSubject] && store.incorrectIdsBySubject[selectedSubject].length > 0;

    if (hasProgress) {
        resumeBtn.style.display = 'inline-block';
    } else {
        resumeBtn.style.display = 'none';
    }

    if (hasProgress || hasIncorrectStats) {
        clearStatsBtn.style.display = 'inline-block';
    } else {
        clearStatsBtn.style.display = 'none';
    }
}

export function getFilteredCount(category) {
    return getQuestionsByCategory(category).length;
}

export function updateQuestionCountDisplay() {
    const display = document.getElementById('question-count-display');
    if (store.allQuestions.length === 0) {
        display.textContent = '';
        return;
    }
    const selectedCategory = document.getElementById('category-select').value;
    display.textContent = `Total questions: ${getFilteredCount(selectedCategory)}`;
}

export function setupCategories() {
    const categories = [...new Set(store.allQuestions.map(q => q.section).filter(Boolean))];
    const select = document.getElementById('category-select');
    select.innerHTML = '<option value="All">📚 All Categories</option>';
    
    const starredCount = getQuestionsByCategory('Starred').length;
    if (starredCount > 0) {
        const opt = document.createElement('option');
        opt.value = 'Starred';
        opt.textContent = `★ Starred [${starredCount}]`;
        select.appendChild(opt);
    }

    const singleCount = getQuestionsByCategory('Type: Single Choice').length;
    if (singleCount > 0) {
        const opt = document.createElement('option');
        opt.value = 'Type: Single Choice';
        opt.textContent = `🔘 Single Choice Only [${singleCount}]`;
        select.appendChild(opt);
    }

    const multiCount = getQuestionsByCategory('Type: Multiple Choice').length;
    if (multiCount > 0) {
        const opt = document.createElement('option');
        opt.value = 'Type: Multiple Choice';
        opt.textContent = `☑️ Multiple Choice Only [${multiCount}]`;
        select.appendChild(opt);
    }

    const singleMultiCount = getQuestionsByCategory('Single+Multiple Choice').length;
    if (singleMultiCount > 0) {
        const opt = document.createElement('option');
        opt.value = 'Single+Multiple Choice';
        opt.textContent = `🔘☑️ Single + Multiple Choice [${singleMultiCount}]`;
        select.appendChild(opt);
    }

    const textCount = getQuestionsByCategory('Type: Text Input').length;
    if (textCount > 0) {
        const opt = document.createElement('option');
        opt.value = 'Type: Text Input';
        opt.textContent = `✍️ Text Input Only [${textCount}]`;
        select.appendChild(opt);
    }
    
    const shortTextCount = getQuestionsByCategory('Short Text Questions').length;
    if (shortTextCount > 0) {
        const opt = document.createElement('option');
        opt.value = 'Short Text Questions';
        opt.textContent = `📝 Short Text Input (Answer ≤${SHORT_WORD_LIMIT} words) [${shortTextCount}]`;
        select.appendChild(opt);
    }

    const longTextCount = getQuestionsByCategory('Long Text Questions').length;
    if (longTextCount > 0) {
        const opt = document.createElement('option');
        opt.value = 'Long Text Questions';
        opt.textContent = `📜 Long Text Input (Answer >${SHORT_WORD_LIMIT} words) [${longTextCount}]`;
        select.appendChild(opt);
    }

    categories.forEach(cat => {
        const count = getQuestionsByCategory(cat).length;
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = `Category ${cat} [${count}]`;
        select.appendChild(option);
    });

    const savedCategory = localStorage.getItem('last_category');
    if (savedCategory && Array.from(select.options).some(opt => opt.value === savedCategory)) {
        select.value = savedCategory;
    } else {
        select.value = 'All';
    }
}