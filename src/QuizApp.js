import React, { useState, useEffect } from "react";
import "./QuizApp.css"

export default function QuizApp() {
    const [quiz, setQuiz] = useState(null);
    const [answers, setAnswers] = useState({});
    const [studentNumber, setStudentNumber] = useState("");
    const [firstNameEnglish, setFirstNameEnglish] = useState("");
    const [lastNameEnglish, setLastNameEnglish] = useState("");
    const [courseNumber, setCourseNumber] = useState("");
    const [quizId, setQuizId] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState(null);
    const [isStudentIdEntered, setIsStudentIdEntered] = useState(false);
    const [score, setScore] = useState(null);
    const [total, setTotal] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const quizIdFromUrl = urlParams.get("quizId");
        const courseNum = urlParams.get("courseNumber");
        if (quizIdFromUrl && courseNum) {
            setQuizId(quizIdFromUrl);
            setCourseNumber(courseNum);
        }
    }, []);

    const fetchQuiz = async () => {
        if (!studentNumber || !firstNameEnglish || !lastNameEnglish || !courseNumber || !quizId) {
            setError("Please enter your student number, first name, last name, and ensure quiz parameters are provided.");
            return;
        }
        const url = `http://localhost:8000/quiz/${parseInt(quizId)}?student_number=${studentNumber}&course_number=${courseNumber}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
            }
            const data = await response.json();
            if (data.message === "You have already taken this quiz.") {
                setSubmitted(true);
                setScore(data.score);
                setTotal(data.total);
                setIsStudentIdEntered(true);
                setQuiz({ title: "Quiz Already Taken" });
                return;
            }
            setQuiz(data);
            setIsStudentIdEntered(true);
            setError(null);

            const hasAudioOrVideo = data.questions.some((q) => q.audio_url || q.video_url);
            const initialTime = hasAudioOrVideo ? 10 * 60 : 5 * 60;
            setTimeLeft(initialTime);
        } catch (err) {
            console.error("Error fetching quiz:", err);
            setError(err.message);
        }
    };

    useEffect(() => {
        if (timeLeft === null || submitted) return;
        if (timeLeft <= 0) {
            submitQuiz();
            return;
        }
        const timerId = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
        return () => clearInterval(timerId);
    }, [timeLeft, submitted]);

    const handleTextInput = (questionId, value) => {
        console.log(`Q${questionId} - Text Input:`, value);
        setAnswers((prev) => ({ ...prev, [questionId]: value }));
    };

    const handleCheckbox = (questionId, value) => {
        const cleanValue = value.includes(": ") ? value.split(": ")[1].trim() : value.trim();
        console.log(`Q${questionId} - Checkbox: Raw=${value}, Clean=${cleanValue}`);
        setAnswers((prev) => {
            const currentAnswers = Array.isArray(prev[questionId]) ? prev[questionId] : [];
            if (currentAnswers.includes(cleanValue)) {
                return { ...prev, [questionId]: currentAnswers.filter((ans) => ans !== cleanValue) };
            } else {
                return { ...prev, [questionId]: [...currentAnswers, cleanValue] };
            }
        });
    };

    const submitQuiz = async () => {
        if (!studentNumber || !firstNameEnglish || !lastNameEnglish) {
            setError("Student number, first name, and last name are required.");
            return;
        }
        const submitUrl = `http://localhost:8000/submit_quiz/${parseInt(quizId)}`;
        // Format answers for backend
        const formattedAnswers = {};
        Object.keys(answers).forEach((qId) => {
            formattedAnswers[qId] = answers[qId];
        });
        const submission = {
            student_number: studentNumber,
            first_name_english: firstNameEnglish,
            last_name_english: lastNameEnglish,
            course_number: courseNumber,
            answers: formattedAnswers
        };
        console.log("Submitting:", submission);
        try {
            const response = await fetch(submitUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(submission)
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
            }
            const result = await response.json();
            setScore(result.score);
            setTotal(result.total);
            setSubmitted(true);
            setError(null);
        } catch (err) {
            console.error("Error submitting quiz:", err);
            setError(err.message);
        }
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const getDirectGoogleDriveUrl = (url) => {
        const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
        if (fileIdMatch) {
            return `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
        }
        return url;
    };

    if (error) return <div style={{ textAlign: "center", color: "red" }}>Error: {error}</div>;

    if (!isStudentIdEntered) {
        return (
            <div className="quiz-container">
                <h1>Enter Student Information</h1>
                <input
                    type="text"
                    placeholder="Student Number (required)"
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    required
                    style={{
                        marginBottom: "10px",
                        width: "200px",
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                    }}
                />
                <input
                    type="text"
                    placeholder="First Name (English) (required)"
                    value={firstNameEnglish}
                    onChange={(e) => setFirstNameEnglish(e.target.value)}
                    required
                    style={{
                        marginBottom: "10px",
                        width: "200px",
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                    }}
                />
                <input
                    type="text"
                    placeholder="Last Name (English) (required)"
                    value={lastNameEnglish}
                    onChange={(e) => setLastNameEnglish(e.target.value)}
                    required
                    style={{
                        marginBottom: "10px",
                        width: "200px",
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                    }}
                />
                <button
                    onClick={fetchQuiz}
                    style={{
                        width: "200px",
                        padding: "8px",
                        backgroundColor: "#4CAF50",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                    }}
                >
                    Start Quiz
                </button>
            </div>
        );
    }

    if (!quiz) return <div style={{ textAlign: "center" }}>Loading...</div>;

    return (
        <div className="quiz-container">
            <h1 style={{ marginBottom: "20px" }}>{quiz.title}</h1>
            {!submitted ? (
                <>
                    <div style={{ marginBottom: "20px", fontSize: "18px", fontWeight: "bold" }}>
                        Time Left: {formatTime(timeLeft)}
                    </div>
                    {quiz.questions.map((q) => (
                        <div
                            key={q.id}
                            style={{
                                border: "1px solid #ccc",
                                padding: "10px",
                                marginBottom: "10px",
                                width: "100%",
                                maxWidth: "600px",
                            }}
                        >
                            <h3>{q.question_text}</h3>
                            {q.image_url && (
                                <img
                                    src={
                                        q.image_url.includes("drive.google.com")
                                            ? `http://localhost:8000/proxy_media/?url=${encodeURIComponent(q.image_url)}`
                                            : q.image_url
                                    }
                                    alt="Question media"
                                    style={{ maxWidth: "100%" }}
                                />
                            )}
                            {q.audio_url && (
                                <audio
                                    controls
                                    onError={(e) => console.error("Audio element error:", e.target.error)}
                                >
                                    {console.log("Raw audio_url:", q.audio_url)}
                                    {console.log(
                                        "Computed src:",
                                        q.audio_url.includes("drive.google.com") &&
                                        !q.audio_url.includes("uc?export=download")
                                            ? getDirectGoogleDriveUrl(q.audio_url)
                                            : `http://localhost:8000/proxy_media/?url=${encodeURIComponent(q.audio_url)}`
                                    )}
                                    <source
                                        src={`http://localhost:8000/proxy_media/?url=${encodeURIComponent(q.audio_url)}`}
                                        type="audio/mpeg"
                                    />
                                    Your browser does not support the audio element.
                                </audio>
                            )}
                            {q.video_url && (
                                <video controls style={{ maxWidth: "100%" }}>
                                    <source
                                        src={
                                            q.video_url.includes("catbox.moe")
                                                ? q.video_url
                                                : `http://localhost:8000/proxy_media/?url=${encodeURIComponent(q.video_url)}`
                                        }
                                    />
                                    Your browser does not support the video element.
                                </video>
                            )}
                            {q.is_text_input ? (
                                <input
                                    type="text"
                                    value={answers[q.id] || ""}
                                    onChange={(e) => handleTextInput(q.id, e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "8px",
                                        borderRadius: "4px",
                                        border: "1px solid #ccc",
                                    }}
                                />
                            ) : (
                                <div>
                                    {q.options.map((opt, index) => {
                                        const cleanOpt = opt.includes(": ")
                                            ? opt.split(": ")[1].trim()
                                            : opt.trim();
                                        return (
                                            <label
                                                key={index}
                                                style={{ display: "block", margin: "5px 0" }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={answers[q.id]?.includes(cleanOpt) || false}
                                                    onChange={() => handleCheckbox(q.id, opt)}
                                                />
                                                {opt}
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                    <button
                        onClick={submitQuiz}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "#4CAF50",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }}
                    >
                        Submit Quiz
                    </button>
                </>
            ) : (
                <div style={{ textAlign: "center" }}>
                    <h2>Quiz Submitted!</h2>
                    <p>
                        Your score: {score}/{total}
                    </p>
                </div>
            )}
        </div>
    );
}