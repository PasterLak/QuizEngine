// editor-script.js

let currentSubject = '';
let targetScrollId = '';

function initEditor() {
    const params = new URLSearchParams(window.location.search);
    currentSubject = params.get('subject');
    targetScrollId = params.get('scrollId');
    
    if (!currentSubject) {
        document.getElementById('editor-subject-title').textContent = 'Error: No subject specified';
        return;
    }
    
    document.getElementById('editor-subject-title').textContent = `Editing: questions/${currentSubject}/questions.json`;
    loadJsonFile();
    
    const textarea = document.getElementById('json-textarea');
    textarea.addEventListener('input', updateHighlighting);
    textarea.addEventListener('scroll', syncScroll);
}

async function loadJsonFile() {
    try {

        if (
            window.opener &&
            !window.opener.closed &&
            typeof window.opener.getCurrentQuestionsJson === 'function'
        ) {

            const text = window.opener.getCurrentQuestionsJson();

            if (text) {
                document.getElementById('json-textarea').value = text;
                updateHighlighting();
                scrollToTarget();
                return;
            }
        }

        const path = `questions/${currentSubject}/questions.json`;
        const res = await fetch(path);

        if (!res.ok)
            throw new Error('File not found');

        const text = await res.text();

        try {
            const parsed = JSON.parse(text);
            const formatted = JSON.stringify(parsed, null, 2);
            document.getElementById('json-textarea').value = formatted;
        } catch {
            document.getElementById('json-textarea').value = text;
        }

        updateHighlighting();
        scrollToTarget();

    } catch (error) {
        alert('Could not load questions.json for this subject.');
    }
}

function scrollToTarget() {
    if (!targetScrollId) return;
    
    const textarea = document.getElementById('json-textarea');
    const text = textarea.value;
    const searchString = `"id": "${targetScrollId}"`;
    const index = text.indexOf(searchString);
    
    if (index !== -1) {
        textarea.focus();
        textarea.setSelectionRange(index, index + searchString.length);
        
        const linesBefore = text.substring(0, index).split('\n').length;
        const totalLines = text.split('\n').length;
        
        const scrollPos = (textarea.scrollHeight / totalLines) * Math.max(0, linesBefore - 5);
        textarea.scrollTop = scrollPos;
        
        syncScroll();
    }
}

function updateHighlighting() {
    const text = document.getElementById('json-textarea').value;
    const codeElement = document.getElementById('highlighting-content');
    codeElement.innerHTML = syntaxHighlight(text);
}

function syncScroll() {
    const textarea = document.getElementById('json-textarea');
    const pre = document.getElementById('highlighting');
    pre.scrollTop = textarea.scrollTop;
    pre.scrollLeft = textarea.scrollLeft;
}

function syntaxHighlight(json) {
    if (!json) return '';
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^"])*"(\s*:\s*)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'property';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="token ' + cls + '">' + match + '</span>';
    });
}

document.getElementById('save-btn').addEventListener('click', () => {
    const text = document.getElementById('json-textarea').value;
    
    try {
        JSON.parse(text);
    } catch (e) {
        alert('Invalid JSON format! Please fix errors before saving.');
        return;
    }

    try {
        if (window.opener && !window.opener.closed && typeof window.opener.updateQuizData === 'function') {
            window.opener.updateQuizData(text);
        }

        const blob = new Blob([text], { type: 'application/json' });
        const a = document.createElement('a');
        
        a.href = URL.createObjectURL(blob);
        a.download = 'questions.json';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(a.href);
        
        alert('Data updated live in the quiz! File downloaded to replace the old questions.json.');
    } catch (err) {
        alert('Save operation failed: ' + err.message);
    }
});

window.onload = initEditor;