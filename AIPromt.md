AI Prompt:

    Extract the questions, options, and correct answers from the attached images and convert them into separeted formatted json messages.

    Follow these strict formatting rules:

        For single-choice questions, "answer" must be an array containing exactly one correct option string.

        For multiple-choice questions, "answer" must be an array containing all correct option strings.

        For text-input questions, do not include the "options" array, and make the "answer" a single string instead of an array.

        Do not include any code comments in the JSON output.
        just send json code. and before write the answer index like: a17.json dont write nothing more!

Here are the 3 simple examples of each question type to use as a reference:
1. Single Choice

{
  "category": "A",
  "topic": "Fundamentals",
  "question": "What is the primary focus of Agile?",
  "options": [
    "Following a strict plan",
    "Delivering working software",
    "Writing comprehensive documentation"
  ],
  "answer": [
    "Delivering working software"
  ]
}

2. Multiple Choice

{
  "category": "B",
  "topic": "Scrum Framework",
  "question": "Which of these are official Scrum artifacts?",
  "options": [
    "Sprint Backlog",
    "Project Charter",
    "Product Backlog",
    "Gantt Chart"
  ],
  "answer": [
    "Sprint Backlog",
    "Product Backlog"
  ]
}

3. Text Write-in

{
  "category": "C",
  "topic": "Terminology",
  "question": "What does the acronym MVP stand for in product development?",
  "answer": "Minimum Viable Product"
}