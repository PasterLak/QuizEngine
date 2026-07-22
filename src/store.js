export const store = {
    allQuestions: [],
    filteredQuestions: [],
    incorrectQuestions: [],
    currentQuestionIndex: 0,
    currentQuestionType: '',
    correctCount: 0,
    incorrectCount: 0,
    currentQuestionsJson: null,
    studyMode: false,
    quizProgress: null,
    answeredQuestions: {},
    incorrectIdsBySubject: {},
    starredIdsBySubject: {}
};

export const storage = {
    load() {
        try { store.quizProgress = JSON.parse(localStorage.getItem('quiz_progress')) || null; } catch (e) { store.quizProgress = null; }
        try { store.incorrectIdsBySubject = JSON.parse(localStorage.getItem('quiz_incorrect_ids')) || {}; } catch (e) { store.incorrectIdsBySubject = {}; }
        try { store.starredIdsBySubject = JSON.parse(localStorage.getItem('quiz_starred_ids')) || {}; } catch (e) { store.starredIdsBySubject = {}; }
    },
    saveProgress(extra = {}) {
        const subject = document.getElementById('subject-select').value;
        if (!subject || store.filteredQuestions.length === 0) return;
        
        const progress = {
            subject,
            category: document.getElementById('category-select').value,
            studyMode: store.studyMode,
            shuffleQuestions: document.getElementById('shuffle-questions').checked,
            shuffleOptions: document.getElementById('shuffle-options').checked,
            questionIds: store.filteredQuestions.map(q => q.id),
            currentQuestionIndex: store.currentQuestionIndex,
            correctCount: store.correctCount,
            incorrectCount: store.incorrectCount,
            answeredQuestions: store.answeredQuestions,
            ...extra
        };

        store.quizProgress = progress;
        try { localStorage.setItem('quiz_progress', JSON.stringify(progress)); } catch (e) {}
    },
    clearProgress() {
        store.quizProgress = null;
        try { localStorage.removeItem('quiz_progress'); } catch (e) {}
    },
    saveIncorrect() {
        try { localStorage.setItem('quiz_incorrect_ids', JSON.stringify(store.incorrectIdsBySubject)); } catch (e) {}
    },
    saveStarred() {
        try { localStorage.setItem('quiz_starred_ids', JSON.stringify(store.starredIdsBySubject)); } catch (e) {}
    }
};