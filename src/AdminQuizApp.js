import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AdminQuizApp.css";

export default function AdminQuizApp() {
    const [quizzes, setQuizzes] = useState([]);
    const [selectedQuizId, setSelectedQuizId] = useState("");
    const [quizTitle, setQuizTitle] = useState("");
    const [quizDescription, setQuizDescription] = useState("");
    const [questions, setQuestions] = useState([{ questionText: "", options: [""], correctAnswers: [], isTextInput: false, imageUrl: "", audioUrl: "", videoUrl: "" }]);
    const [editingQuizId, setEditingQuizId] = useState(null);
    const [error, setError] = useState(null);
    const [courseNumber, setCourseNumber] = useState("");
    const [quizUrl, setQuizUrl] = useState("");
    const [showQuizList, setShowQuizList] = useState(true);

    const fetchQuizzes = async () => {
        try {
            const response = await fetch("http://localhost:8000/quizzes/");
            if (!response.ok) throw new Error("Failed to fetch quizzes");
            const data = await response.json();
            setQuizzes(data);
            setError(null);
        } catch (err) {
            console.error("Error fetching quizzes:", err);
            setError(err.message);
        }
    };

    useEffect(() => {
        fetchQuizzes();
    }, []);

    const fetchQuizDetails = async (quizId) => {
        if (!quizId) return;
        try {
            const response = await fetch(`http://localhost:8000/quiz_details/${quizId}`);
            if (!response.ok) throw new Error("Failed to fetch quiz details");
            const data = await response.json();
            setQuizTitle(data.title);
            setQuizDescription(data.description);
            setQuestions(data.questions.map(q => ({
                questionText: q.question_text,
                options: q.options.length ? q.options : [""],
                correctAnswers: q.correct_answers,
                isTextInput: q.is_text_input,
                imageUrl: q.image_url || "",
                audioUrl: q.audio_url || "",
                videoUrl: q.video_url || ""
            })));
            setEditingQuizId(quizId);
            setError(null);
        } catch (err) {
            console.error("Error fetching quiz details:", err);
            setError(err.message);
        }
    };

    const submitQuiz = async () => {
        if (!quizTitle.trim()) {
            setError("Quiz title is required.");
            return;
        }
        if (questions.some(q => !q.questionText.trim())) {
            setError("All questions must have text.");
            return;
        }
        const quizData = {
            title: quizTitle,
            description: quizDescription,
            questions: questions.map(q => ({
                question_text: q.questionText,
                options: q.isTextInput ? null : q.options.filter(opt => opt !== ""),
                correct_answers: q.correctAnswers.filter(ans => ans !== ""),
                is_text_input: q.isTextInput,
                image_url: q.imageUrl || "",
                audio_url: q.audioUrl || "",
                video_url: q.videoUrl || ""
            }))
        };
        console.log("Submitting quiz data:", quizData);
        const url = editingQuizId ? `http://localhost:8000/update_quiz/${editingQuizId}` : "http://localhost:8000/add_quiz/";
        const method = editingQuizId ? "PUT" : "POST";

        try {
            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(quizData)
            });
            console.log("Response status:", response.status, "OK:", response.ok);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to ${editingQuizId ? "update" : "add"} quiz: ${errorText}`);
            }
            resetForm();
            setShowQuizList(true);
            await fetchQuizzes();
            setSelectedQuizId("");
        } catch (err) {
            console.error(`Error ${editingQuizId ? "updating" : "adding"} quiz:`, err);
            setError(err.message);
        }
    };

    const deleteQuiz = async () => {
        if (!selectedQuizId) {
            setError("No quiz selected to delete.");
            return;
        }
        if (!window.confirm("Are you sure you want to delete this quiz?")) return;
        try {
            const response = await fetch(`http://localhost:8000/delete_quiz/${selectedQuizId}`, { method: "DELETE" });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText);
            }
            resetForm();
            setShowQuizList(true);
            await fetchQuizzes();
            setError(null);
        } catch (err) {
            console.error("Error deleting quiz:", err);
            let errorMessage;
            try {
                const parsedError = JSON.parse(err.message);
                errorMessage = parsedError.detail || err.message;
            } catch {
                errorMessage = err.message;
            }
            setError(`Failed to delete quiz: ${errorMessage}`);
        }
    };

    const generateQuizUrl = () => {
        if (!selectedQuizId || !courseNumber) {
            setError("Please select a quiz and enter a course number.");
            return;
        }
        const cleanCourseNumber = courseNumber.trim().replace(/[^0-9]/g, '');
        if (!cleanCourseNumber) {
            setError("Invalid course number.");
            return;
        }
        const url = `http://localhost:3000/quiz?quizId=${selectedQuizId}&courseNumber=${cleanCourseNumber}`;
        setQuizUrl(url);
        navigator.clipboard.writeText(url);
        alert(`URL copied to clipboard: ${url}`);
    };

    const downloadQRCode = () => {
        if (!selectedQuizId || !courseNumber) {
            setError("Please select a quiz and enter a course number.");
            return;
        }
        const cleanCourseNumber = courseNumber.trim().replace(/[^0-9]/g, '');
        if (!cleanCourseNumber) {
            setError("Invalid course number.");
            return;
        }
        const qrUrl = `http://localhost:8000/generate_qr/${selectedQuizId}/${cleanCourseNumber}`;
        axios.get(qrUrl, { responseType: 'blob' })
            .then(response => {
                const blob = new Blob([response.data], { type: 'image/png' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `qr_quiz_${selectedQuizId}_${cleanCourseNumber}.png`;
                link.click();
                URL.revokeObjectURL(link.href);
                setError(null);
            })
            .catch(err => {
                console.error("Error downloading QR code:", err);
                setError("Failed to download QR code.");
            });
    };

    const resetForm = () => {
        setQuizTitle("");
        setQuizDescription("");
        setQuestions([{ questionText: "", options: [""], correctAnswers: [], isTextInput: false, imageUrl: "", audioUrl: "", videoUrl: "" }]);
        setEditingQuizId(null);
        setSelectedQuizId("");
        setCourseNumber("");
        setQuizUrl("");
        setError(null);
    };

    const addQuestion = () => {
        setQuestions([...questions, { questionText: "", options: [""], correctAnswers: [], isTextInput: false, imageUrl: "", audioUrl: "", videoUrl: "" }]);
    };

    const addOption = (qIndex) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options.push("");
        setQuestions(newQuestions);
    };

    const updateQuestion = (index, field, value) => {
        const newQuestions = [...questions];
        newQuestions[index][field] = value;
        setQuestions(newQuestions);
    };

    const updateOption = (qIndex, oIndex, value) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex] = value;
        setQuestions(newQuestions);
    };

    if (showQuizList) {
        return (
            <div className="admin-container">
                <h1 style={{ fontSize: "24px", color: "#202124" }}>Your Quizzes</h1>
                <button
                    onClick={() => {
                        setShowQuizList(false);
                        resetForm();
                        setSelectedQuizId("");
                    }}
                    style={{ padding: "8px 16px", backgroundColor: "#1a73e8", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                >
                    Create New Quiz
                </button>
                <ul className="quiz-list">
                    {quizzes.map(quiz => (
                        <li key={quiz.id}>
                            <a
                                onClick={() => {
                                    setShowQuizList(false);
                                    setSelectedQuizId(quiz.id);
                                    fetchQuizDetails(quiz.id);
                                }}
                            >
                                {`${quiz.id} - ${quiz.title} - ${new Date(quiz.created_at).toLocaleDateString()}`}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        );
    }

    return (
        <div className="admin-container">
            <h1 style={{ fontSize: "24px", color: "#202124", textAlign: "center" }}>Admin: Manage Quizzes</h1>
            <button
                onClick={() => setShowQuizList(true)}
                style={{ padding: "8px 16px", backgroundColor: "#1a73e8", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginBottom: "10px", alignSelf: "center" }}
            >
                Back to Quiz List
            </button>
            {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}

            <div style={{ width: "100%", marginBottom: "20px" }}>
                <label style={{ fontSize: "16px", color: "#202124" }}>Select Quiz:</label>
                <select
                    value={selectedQuizId}
                    onChange={(e) => {
                        const newQuizId = e.target.value;
                        setSelectedQuizId(newQuizId);
                        if (newQuizId) {
                            fetchQuizDetails(newQuizId);
                        } else {
                            resetForm();
                        }
                    }}
                    style={{ width: "100%", padding: "8px", marginTop: "5px", borderRadius: "4px", border: "1px solid #dadce0" }}
                >
                    <option value="">-- Create New Quiz --</option>
                    {quizzes.map(quiz => (
                        <option key={quiz.id} value={quiz.id}>
                            {`${quiz.id} - ${quiz.title} - ${new Date(quiz.created_at).toLocaleDateString()}`}
                        </option>
                    ))}
                </select>
            </div>

            <div style={{ width: "100%", backgroundColor: "white", padding: "20px", border: "1px solid #dadce0", borderRadius: "8px" }}>
                <input
                    type="text"
                    placeholder="Quiz Title"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    style={{ width: "100%", marginBottom: "10px", padding: "10px", borderRadius: "4px", border: "1px solid #dadce0", fontSize: "16px" }}
                />
                <textarea
                    placeholder="Quiz Description"
                    value={quizDescription}
                    onChange={(e) => setQuizDescription(e.target.value)}
                    style={{ width: "100%", marginBottom: "10px", padding: "10px", borderRadius: "4px", border: "1px solid #dadce0", fontSize: "16px" }}
                />
                {questions.map((q, qIndex) => (
                    <div key={qIndex} style={{ border: "1px solid #dadce0", padding: "10px", marginBottom: "10px", borderRadius: "4px" }}>
                        <input
                            type="text"
                            placeholder="Question Text"
                            value={q.questionText}
                            onChange={(e) => updateQuestion(qIndex, "questionText", e.target.value)}
                            style={{ width: "100%", marginBottom: "5px", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
                        />
                        <label style={{ display: "block", marginBottom: "5px" }}>
                            <input
                                type="checkbox"
                                checked={q.isTextInput}
                                onChange={(e) => updateQuestion(qIndex, "isTextInput", e.target.checked)}
                            />
                            Text Input Question
                        </label>
                        {!q.isTextInput && (
                            <>
                                {q.options.map((opt, oIndex) => (
                                    <input
                                        key={oIndex}
                                        type="text"
                                        placeholder={`Option ${oIndex + 1}`}
                                        value={opt}
                                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                        style={{ width: "100%", marginBottom: "5px", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
                                    />
                                ))}
                                <button
                                    onClick={() => addOption(qIndex)}
                                    style={{ padding: "4px 8px", backgroundColor: "#1a73e8", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                                >
                                    Add Option
                                </button>
                            </>
                        )}
                        <input
                            type="text"
                            placeholder="Correct Answers (comma-separated)"
                            value={q.correctAnswers.join(",")}
                            onChange={(e) => updateQuestion(qIndex, "correctAnswers", e.target.value.split(","))}
                            style={{ width: "100%", marginBottom: "5px", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
                        />
                        <input
                            type="text"
                            placeholder="Image URL (optional)"
                            value={q.imageUrl}
                            onChange={(e) => updateQuestion(qIndex, "imageUrl", e.target.value)}
                            style={{ width: "100%", marginBottom: "5px", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
                        />
                        <input
                            type="text"
                            placeholder="Audio URL (optional)"
                            value={q.audioUrl}
                            onChange={(e) => updateQuestion(qIndex, "audioUrl", e.target.value)}
                            style={{ width: "100%", marginBottom: "5px", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
                        />
                        <input
                            type="text"
                            placeholder="Video URL (optional)"
                            value={q.videoUrl}
                            onChange={(e) => updateQuestion(qIndex, "videoUrl", e.target.value)}
                            style={{ width: "100%", marginBottom: "5px", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
                        />
                    </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
                    <button
                        onClick={addQuestion}
                        style={{ padding: "8px 16px", backgroundColor: "#1a73e8", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                        Add Question
                    </button>
                    <button
                        onClick={submitQuiz}
                        style={{ padding: "8px 16px", backgroundColor: "#34a853", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                        {editingQuizId ? "Update Quiz" : "Add Quiz"}
                    </button>
                    {editingQuizId && (
                        <button
                            onClick={deleteQuiz}
                            style={{ padding: "8px 16px", backgroundColor: "#ea4335", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                        >
                            Delete Quiz
                        </button>
                    )}
                </div>
            </div>

            {editingQuizId && (
                <div className="share-section">
                    <h3>Share Quiz</h3>
                    <input
                        type="text"
                        placeholder="Enter Course Number (e.g., 0012323)"
                        value={courseNumber}
                        onChange={(e) => setCourseNumber(e.target.value)}
                        style={{ width: "50%", padding: "8px", marginBottom: "10px", borderRadius: "4px", border: "1px solid #dadce0" }}
                    />
                    <div style={{ marginBottom: "10px" }}>
                        <button onClick={generateQuizUrl}>Generate URL</button>
                        <button onClick={downloadQRCode}>Download QR Code</button>
                    </div>
                    {quizUrl && (
                        <>
                            <p>
                                Generated URL: <a href={quizUrl} target="_blank" rel="noopener noreferrer">{quizUrl}</a>
                            </p>
                            <img
                                src={`https://quiz-app-backend-jp.fly.dev/generate_qr/${selectedQuizId}/${courseNumber.trim().replace(/[^0-9]/g, '')}`}
                                alt={`QR Code for Quiz ${selectedQuizId}`}
                                className="qr-code"
                            />
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
