import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';

import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';   // ✅ ONLY Button import
import SalarySlip from '../components/SalarySlip';

import '../styles/EmployeeDashboard.css';
import '../styles/Messages.css';
import '../styles/Button.css';

// import * as faceapi from 'face-api.js'; // Switched to CDN to avoid Webpack 5 fs errors
const faceapi = window.faceapi;



/* =========================
/* =========================
   TESTING / DEVELOPER CONFIG
   ========================= */
const USE_MOCK_LOCATION = true; // Set to TRUE to simulate being at the coordinates below
const TEST_LAT = 9.572462;
const TEST_LNG = 77.962319;

// Fallback Office (if no DB match found)
// const FALLBACK_OFFICE_LAT = TEST_LAT;
// const FALLBACK_OFFICE_LNG = TEST_LNG;
// const FALLBACK_RADIUS = 2000;


/* =========================
   DISTANCE CALCULATION
   ========================= */
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;

    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}



const EmployeeDashboard = () => {
    const today = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const weekdayShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const [canMarkAttendance, setCanMarkAttendance] = useState(false);
    const [locationMsg, setLocationMsg] = useState('');
    const [assignedLocation, setAssignedLocation] = useState(null);
    const [allLocations, setAllLocations] = useState([]);
    const [currentPos, setCurrentPos] = useState(null); // { lat, lng }
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [livenessStatus, setLivenessStatus] = useState('Standby'); // Standby, Instructions, Verifying, Success, Failed
    const [livenessMsg, setLivenessMsg] = useState('Position your face in the frame');
    const [referenceDescriptor, setReferenceDescriptor] = useState(null);
    const [showCameraModal, setShowCameraModal] = useState(false);
    // Daily text verification
    const [dailyText, setDailyText] = useState("");
    const [typedText, setTypedText] = useState("");
    const [textVerified, setTextVerified] = useState(false);

    // State
    const [employeeData, setEmployeeData] = useState(null);
    const [attendance, setAttendance] = useState({});
    const [payslipData, setPayslipData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewDate, setViewDate] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });
    const [myLeaves, setMyLeaves] = useState([]);

    // Refs for camera
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const [searchParams, setSearchParams] = useSearchParams();
    const viewMode = searchParams.get('v') || 'overview'; // 'overview' or 'slip'

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const viewingMonth = `${year}-${String(month + 1).padStart(2, '0')}`;


    // Fetch full employee details including payroll config
    useEffect(() => {
        if (!user?.email) return;

        const fetchDetails = async () => {
            try {
                const res = await fetch('http://localhost:5001/api/employees');
                if (!res.ok) throw new Error('Failed to fetch');
                const data = await res.json();
                const currentEmp = data.find(emp => emp.email === user.email || emp.employeeId === user.employeeId);
                if (currentEmp) setEmployeeData(currentEmp);
            } catch (err) {
                console.warn('Error fetching employee details:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [user]);
    // Load Models and Reference Descriptor
    useEffect(() => {
        const loadModelsAndDescriptor = async () => {
            const MODEL_URL = '/models';
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
                console.log("Face models loaded");

                if (employeeData?.photo) {
                    const img = await faceapi.fetchImage(employeeData.photo);
                    const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
                    if (detection) {
                        setReferenceDescriptor(detection.descriptor);
                        console.log("Reference descriptor created");
                    } else {
                        console.warn("Could not extract descriptor from profile photo");
                    }
                }
            } catch (err) {
                console.error("Error loading models/descriptor:", err);
            }
        };
        if (employeeData) loadModelsAndDescriptor();
    }, [employeeData]);

    // Fetch site assignment for current date
    useEffect(() => {
        if (!employeeData?.employeeId) return;

        const fetchAssignment = async () => {
            const d = new Date();
            const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            try {
                const res = await fetch(`http://localhost:5001/api/site-assignments?employeeId=${employeeData.employeeId}&date=${today}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.locationId) {
                        setAssignedLocation(data.locationId);
                    } else {
                        // If no assignment, maybe default to main office?
                        // For now we assume they must be assigned.
                        setAssignedLocation(null);
                    }
                }
            } catch (err) {
                console.warn("Error fetching site assignment:", err);
            }
        };
        fetchAssignment();
    }, [employeeData]);

    // Fetch all managed locations from database
    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const res = await fetch('http://localhost:5001/api/locations');
                if (res.ok) {
                    const data = await res.json();
                    setAllLocations(data);
                }
            } catch (err) {
                console.warn("Error fetching managed locations:", err);
            }
        };
        fetchLocations();
    }, []);

    useEffect(() => {
        if (!employeeData) return;

        if (!employeeData) return;

        // GPS LOCATION STRATEGY
        const getGeoLocation = (onSuccess, onError) => {
            if (USE_MOCK_LOCATION) {
                console.log("⚠️ USING MOCK LOCATION");
                onSuccess({
                    coords: {
                        latitude: TEST_LAT,
                        longitude: TEST_LNG,
                        accuracy: 10
                    }
                });
            } else {
                navigator.geolocation.getCurrentPosition(onSuccess, onError, { enableHighAccuracy: true });
            }
        };

        getGeoLocation(
            (pos) => {
                const userLat = pos.coords.latitude;
                const userLng = pos.coords.longitude;
                setCurrentPos({ lat: userLat, lng: userLng });

                // STRICT VALIDATION LOGIC
                // 1. If Assigned: Must be at that specific location.
                // 2. If Not Assigned: Must be at ANY valid company location.

                let matchedLoc = null;
                let nearestLoc = null;
                let minDist = Infinity;

                // Helper to check list
                const checkLocations = (vals) => {
                    for (let loc of vals) {
                        const dist = getDistance(userLat, userLng, loc.latitude, loc.longitude);
                        const radius = loc.radius || 100;

                        // Keep track of nearest for error message
                        if (dist < minDist) {
                            minDist = dist;
                            nearestLoc = { ...loc, dist };
                        }

                        if (dist <= radius) {
                            return { ...loc, dist }; // Found a match!
                        }
                    }
                    return null;
                };

                if (assignedLocation) {
                    // Check ONLY assigned location
                    matchedLoc = checkLocations([assignedLocation]);
                } else {
                    // Check ALL locations
                    matchedLoc = checkLocations(allLocations);
                }

                if (matchedLoc) {
                    setCanMarkAttendance(true);
                    setLocationMsg(`✅ Inside ${matchedLoc.name} (${Math.round(matchedLoc.dist)} m)`);
                } else {
                    setCanMarkAttendance(false);
                    // Determine what to show in error
                    if (nearestLoc) {
                        setLocationMsg(`❌ Outside ${nearestLoc.name} (${Math.round(nearestLoc.dist)} m) \n Your Pos: ${userLat.toFixed(6)}, ${userLng.toFixed(6)}`);
                    } else {
                        setLocationMsg(`❌ No Office Assigned/Found \n Your Pos: ${userLat.toFixed(6)}, ${userLng.toFixed(6)}`);
                    }
                }
            },
            () => {
                setCanMarkAttendance(false);
                setLocationMsg('❌ Location permission required');
            }
        );
    }, [employeeData, assignedLocation, allLocations]);

    const stopCamera = useCallback(() => {
        const video = videoRef.current;
        if (video && video.srcObject) {
            const stream = video.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            video.srcObject = null;
        }
    }, []);
    /* =========================
   DAILY TEXT VERIFICATION
   ========================= */

    const DAILY_TEXTS = [
        "Discipline builds success",
        "Honesty defines professionalism",
        "Consistency creates excellence",
        "Integrity matters every day",
        "Responsibility reflects character"
    ];

    const getTodayText = () => {
        const today = new Date().toISOString().slice(0, 10);
        const index =
            today.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0) %
            DAILY_TEXTS.length;
        return DAILY_TEXTS[index];
    };


    const markAttendanceWithPhoto = useCallback(async (photoData, verifyStatus = 'Manual Capture') => {
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        try {
            const res = await fetch('http://localhost:5001/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId: employeeData.employeeId,
                    date: today,
                    status: 'P',
                    photo: photoData,
                    verifyStatus: verifyStatus,
                    location: currentPos ? {
                        lat: currentPos.lat,
                        lng: currentPos.lng,
                        siteName: assignedLocation?.name || "Office"
                    } : null
                })
            });

            if (res.ok) {
                alert(`Attendance marked successfully: ${verifyStatus}`);
                setAttendance(prev => ({ ...prev, [today]: 'P' }));
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(`Error marking attendance: ${errData.message || res.statusText || 'Unknown error'}`);
            }
        } catch {
            alert('Connection error with attendance server');
        }
    }, [employeeData, currentPos, assignedLocation]);

    const captureAndSubmit = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas) {
            const context = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0);
            const photoData = canvas.toDataURL('image/jpeg');
            stopCamera();
            setShowCameraModal(false);
            markAttendanceWithPhoto(photoData, 'Verified (Liveness + Face Match)');
        }
    }, [stopCamera, markAttendanceWithPhoto]);

    const runFaceDetection = useCallback(async () => {
        const video = videoRef.current;
        if (!video || !modelsLoaded) return;

        setLivenessMsg("Detecting face...");
        setLivenessStatus('Verifying');

        let blinkDetected = false;
        let faceMatched = false;

        const faceMatcher = referenceDescriptor ? new faceapi.FaceMatcher(referenceDescriptor, 0.6) : null;

        const interval = setInterval(async () => {
            if (!video || video.paused || video.ended) {
                clearInterval(interval);
                return;
            }

            const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detection) {
                // 1. Face Match Check
                if (faceMatcher) {
                    const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
                    if (bestMatch.label !== 'unknown') {
                        faceMatched = true;
                    }
                } else {
                    faceMatched = true; // Skip matching if no reference, but warning
                }

                // 2. Liveness Check (Blink detection)
                const landmarks = detection.landmarks;
                const leftEye = landmarks.getLeftEye();
                const rightEye = landmarks.getRightEye();

                const getEAR = (eye) => {
                    const p1 = eye[0], p2 = eye[1], p3 = eye[2], p4 = eye[3], p5 = eye[4], p6 = eye[5];
                    const dist = () => Math.sqrt((p2.x - p6.x) ** 2 + (p2.y - p6.y) ** 2) + Math.sqrt((p3.x - p5.x) ** 2 + (p3.y - p5.y) ** 2);
                    const denom = 2 * Math.sqrt((p1.x - p4.x) ** 2 + (p1.y - p4.y) ** 2);
                    return dist() / denom;
                };

                const ear = (getEAR(leftEye) + getEAR(rightEye)) / 2;

                if (ear < 0.2) {
                    blinkDetected = true;
                }

                if (faceMatched && blinkDetected) {
                    setLivenessMsg("✅ Verified! Capturing...");
                    setLivenessStatus('Success');
                    clearInterval(interval);
                    setTimeout(() => captureAndSubmit(), 1000);
                } else if (faceMatched) {
                    setLivenessMsg("Please blink your eyes to verify liveness");
                } else {
                    setLivenessMsg("Face not recognized. Use your profile photo face.");
                }
            } else {
                setLivenessMsg("Place your face clearly in the camera");
            }
        }, 200);

        return () => clearInterval(interval);
    }, [modelsLoaded, referenceDescriptor, captureAndSubmit]);

    const startCamera = useCallback(async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Camera not supported in this browser.');
            setShowCameraModal(false);
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
            const video = videoRef.current;
            if (video) {
                video.srcObject = stream;
                video.onloadedmetadata = () => {
                    video.play();
                    runFaceDetection();
                };
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Camera access denied or unavailable.');
            setShowCameraModal(false);
        }
    }, [runFaceDetection]);

    // Camera management
    useEffect(() => {
        if (showCameraModal) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [showCameraModal, startCamera, stopCamera]);

    useEffect(() => {
        setDailyText(getTodayText());
    }, []);

    useEffect(() => {
        const normalize = (str) => str.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").trim().toLowerCase();
        setTextVerified(
            normalize(typedText) === normalize(dailyText)
        );
    }, [typedText, dailyText]);


    // Fetch attendance for the viewing month
    useEffect(() => {
        if (!employeeData?.employeeId) return;

        const fetchAttendance = async () => {
            try {
                const res = await fetch(`http://localhost:5001/api/attendance?employeeId=${encodeURIComponent(employeeData.employeeId)}&month=${viewingMonth}`);
                if (!res.ok) throw new Error('Failed to fetch attendance');
                const data = await res.json();

                let statuses = {};
                if (Array.isArray(data)) {
                    data.forEach(item => {
                        if (item.date && item.status) statuses[item.date] = item.status;
                    });
                } else if (data && typeof data === 'object') {
                    Object.keys(data).forEach(date => {
                        const dayData = data[date];
                        if (typeof dayData === 'string') {
                            statuses[date] = dayData; // backward compatibility
                        } else if (dayData && dayData.status) {
                            statuses[date] = dayData.status;
                        }
                    });
                }
                setAttendance(statuses);
            } catch (err) {
                console.warn('Error fetching attendance:', err);
                setAttendance({});
            }
        };

        const fetchPayslip = async () => {
            try {
                const res = await fetch(`http://localhost:5001/api/payslip?employeeId=${encodeURIComponent(employeeData.employeeId)}&month=${viewingMonth}`);
                if (!res.ok) throw new Error('Failed to fetch payslip');
                const data = await res.json();
                setPayslipData(data);
            } catch (err) {
                console.warn('Error fetching payslip:', err);
                setPayslipData(null);
            }
        };

        const fetchMyLeaves = async () => {
            try {
                const res = await fetch(`http://localhost:5001/api/leaves?employeeId=${encodeURIComponent(employeeData.employeeId)}`);
                if (res.ok) {
                    const data = await res.json();
                    setMyLeaves(data);
                }
            } catch (err) {
                console.warn('Error fetching my leaves:', err);
            }
        };

        fetchAttendance();
        fetchPayslip();
        fetchMyLeaves();
    }, [employeeData, viewingMonth]);

    // Calculations
    const stats = useMemo(() => {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const p = Object.values(attendance).filter(s => s === 'P').length;
        const a = Object.values(attendance).filter(s => s === 'A').length;
        const l = Object.values(attendance).filter(s => s === 'L').length;
        return { totalDays: daysInMonth, present: p, absent: a, leave: l };
    }, [attendance, year, month]);

    const payrollResults = useMemo(() => {
        const payroll = payslipData?.earnings || employeeData?.payroll;
        if (!payroll) return { netPayable: 0, gross: 0, tax: 0, proRated: 0, deductions: 0, breakdown: {} };

        const { basicSalary, hra, splAllowance, travelAllowance, allowances, bonus, insteadDue } = payroll;
        const pf = payslipData?.deductions?.pf || employeeData?.payroll?.pf || 0;
        const taxRate = payslipData?.deductions?.taxPercent || employeeData?.payroll?.tax || 0;

        const basic = parseFloat(basicSalary) || 0;
        const h = parseFloat(hra) || 0;
        const spl = parseFloat(splAllowance) || 0;
        const travel = parseFloat(travelAllowance) || 0;
        const allow = parseFloat(allowances) || 0;
        const bns = parseFloat(bonus) || 0;
        const inst = parseFloat(insteadDue) || 0;
        const pfVal = parseFloat(pf) || 0;
        const tRate = parseFloat(taxRate) || 0;

        const gross = basic + h + spl + travel + allow + bns + inst;
        const proRated = stats.totalDays > 0 ? (gross / stats.totalDays) * stats.present : 0;
        const taxVal = proRated * (tRate / 100);
        const net = proRated - taxVal - pfVal;

        return {
            gross,
            proRated,
            tax: taxVal,
            pf: pfVal,
            deductions: taxVal + pfVal,
            netPayable: net,
            taxRate: tRate,
            breakdown: { basic, h, spl, travel, allow, bns, inst }
        };
    }, [employeeData, payslipData, stats]);

    const handlePrev = () => setViewDate(new Date(year, month - 1, 1));
    const handleNext = () => setViewDate(new Date(year, month + 1, 1));

    // Leave System State
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [leaveData, setLeaveData] = useState({
        startDate: '',
        endDate: '',
        reason: '',
        type: 'Casual'
    });








    const handleLeaveSubmit = async (e) => {
        e.preventDefault();

        // Calculate requested duration
        const start = new Date(leaveData.startDate);
        const end = new Date(leaveData.endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // Balance Validation
        const type = leaveData.type.toLowerCase();

        // Create final payload to avoid mutating state directly
        const submissionData = { ...leaveData };

        // Skip balance check for LOP
        if (leaveData.type !== 'Loss of Pay (LOP)') {
            const availableBalance = employeeData.leaveBalances ? employeeData.leaveBalances[type] : 0;

            if (diffDays > availableBalance) {
                const proceedAsLOP = window.confirm(
                    `Insufficient balance for ${leaveData.type} Leave.\n\nYou have ${availableBalance} days remaining, but you're requesting ${diffDays} days.\n\nWould you like to submit this as "Loss of Pay (LOP)" leave instead?`
                );

                if (proceedAsLOP) {
                    submissionData.type = 'Loss of Pay (LOP)';
                } else {
                    return;
                }
            }
        }

        try {
            const res = await fetch('http://localhost:5001/api/leaves', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...submissionData,
                    employeeId: employeeData.employeeId,
                    employeeName: employeeData.fullName
                })
            });

            if (res.ok) {
                alert('Leave request submitted successfully!');
                setShowLeaveModal(false);
                setLeaveData({ startDate: '', endDate: '', reason: '', type: 'Casual' });
                // Refresh leaves list
                const refreshed = await fetch(`http://localhost:5001/api/leaves?employeeId=${encodeURIComponent(employeeData.employeeId)}`);
                if (refreshed.ok) setMyLeaves(await refreshed.json());
            } else {
                const errData = await res.json();
                alert(`Error: ${errData.message || 'Failed to submit request'}`);
            }
        } catch (err) {
            console.error('Leave submission error:', err);
            alert('Network error. Please try again.');
        }
    };

    const handleLeaveDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this leave request?')) return;

        try {
            const res = await fetch(`http://localhost:5001/api/leaves/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setMyLeaves(prev => prev.filter(l => l._id !== id));
            } else {
                alert('Failed to delete leave request');
            }
        } catch (err) {
            console.error('Delete leave error:', err);
        }
    };

    // Track if we're returning from Messages to prevent premature logout
    useEffect(() => {
        // Scroll to top when component mounts/changes
        window.scrollTo(0, 0);
    }, [viewMode]);

    // If user uses browser navigation (back/forward), force logout for safety
    useEffect(() => {
        // Only apply popstate logout if user is NOT on the Messages page
        if (viewMode === 'overview') {
            const handlePop = () => {
                try {
                    logout();
                } finally {
                    navigate('/login');
                }
            };

            window.addEventListener('popstate', handlePop);
            return () => window.removeEventListener('popstate', handlePop);
        }
    }, [logout, navigate, viewMode]);

    if (loading && !employeeData) return <div style={{ padding: '40px' }}>Loading your dashboard...</div>;



    return (
        <div className="employee-card">
            <div className="container">
                <div className="dashboard-header no-print">
                    <div>
                        <h1 className="title-gradient" style={{ fontSize: '2.5rem', marginBottom: '5px' }}>My Portfolio</h1>
                        <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Welcome, {employeeData?.fullName || user?.email}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <div className="fly-card" style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 20px', borderRadius: '50px' }}>
                            <button onClick={handlePrev} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--primary)' }}>◀</button>

                            <select
                                value={month}
                                onChange={(e) => setViewDate(new Date(year, parseInt(e.target.value), 1))}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    fontWeight: 800,
                                    fontSize: '0.95rem',
                                    color: 'var(--text-main)',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    appearance: 'none',
                                    textAlign: 'center'
                                }}
                            >
                                {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => (
                                    <option key={m} value={i}>{m}</option>
                                ))}
                            </select>

                            <select
                                value={year}
                                onChange={(e) => setViewDate(new Date(parseInt(e.target.value), month, 1))}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    fontWeight: 800,
                                    fontSize: '0.95rem',
                                    color: 'var(--text-main)',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    paddingLeft: '5px'
                                }}
                            >
                                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>

                            <button onClick={handleNext} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--primary)' }}>▶</button>
                        </div>
                        <Button
                            onClick={() => navigate('/profile')}
                            className="btn-profile"
                        >
                            👤 My Profile
                        </Button>
                        {viewMode === 'overview' && (
                            <Button
                                onClick={() => setSearchParams({ v: 'slip' })}
                                className="btn-payslip"
                                style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                            >
                                📄 Salary Slip
                            </Button>
                        )}
                        <Button
                            onClick={() => navigate('/messages')}
                            className="btn-message"
                        >
                            💬 Messages
                        </Button>
                        <Button
                            onClick={() => setShowLeaveModal(true)}
                            className="btn-leave"
                            style={{
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                color: 'white',
                                padding: '0.4rem 0.8rem',
                                fontSize: '0.8rem'
                            }}
                        >
                            📅 Request Leave
                        </Button>
                        <Button
                            className="logout-btn"
                            onClick={() => { logout(); navigate('/login'); }}
                            variant="secondary"
                            style={{
                                padding: '0.6rem 1.8rem',
                                fontSize: '0.95rem',
                                fontWeight: '700',
                                borderRadius: '50px',
                                background: '#fff'
                            }}
                        >
                            Logout
                        </Button>
                    </div>
                </div>

                {/* Leave Modal */}
                {showLeaveModal && createPortal(
                    <div className="modal-overlay">
                        <div className="message-form-card fade-in" style={{ position: 'relative', zIndex: 1001, width: '90%', maxWidth: '500px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                                <h3 className="title-gradient" style={{ margin: 0, fontSize: '1.5rem' }}>📅 Request Leave</h3>
                                <button onClick={() => setShowLeaveModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                            </div>

                            <form onSubmit={handleLeaveSubmit}>
                                <div style={{ marginBottom: '20px' }}>
                                    <label className="form-label">Leave Type</label>
                                    <select
                                        value={leaveData.type}
                                        onChange={(e) => setLeaveData({ ...leaveData, type: e.target.value })}
                                        className="form-select"
                                        required
                                    >
                                        <option value="Casual">Casual Leave</option>
                                        <option value="Sick">Sick Leave</option>
                                        <option value="Earned">Earned Leave</option>
                                        <option value="Loss of Pay (LOP)">Loss of Pay (LOP)</option>
                                    </select>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                                    <div>
                                        <label className="form-label">From</label>
                                        <input
                                            type="date"
                                            value={leaveData.startDate}
                                            onChange={(e) => setLeaveData({ ...leaveData, startDate: e.target.value })}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label">To</label>
                                        <input
                                            type="date"
                                            value={leaveData.endDate}
                                            onChange={(e) => setLeaveData({ ...leaveData, endDate: e.target.value })}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                </div>
                                <div style={{ marginBottom: '25px' }}>
                                    <label className="form-label">Reason</label>
                                    <textarea
                                        value={leaveData.reason}
                                        onChange={(e) => setLeaveData({ ...leaveData, reason: e.target.value })}
                                        className="form-textarea"
                                        rows="3"
                                        required
                                        placeholder="Brief reason for leave..."
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                    <Button type="button" variant="secondary" onClick={() => setShowLeaveModal(false)}>Cancel</Button>
                                    <Button type="submit" variant="primary">Submit Request</Button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Camera Modal */}
                {showCameraModal && createPortal(
                    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                        <div style={{ background: 'white', padding: '30px', borderRadius: '24px', maxWidth: '500px', width: '90%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                            <h3 className="title-gradient" style={{ marginBottom: '10px' }}>Secure Attendance</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontWeight: '500' }}>Biometric Verification in progress...</p>

                            <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', background: '#000', height: '350px' }}>
                                <video ref={videoRef} autoPlay muted style={{ width: '100%', height: '100%', objectFit: 'cover' }}></video>
                                <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>

                                <div style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    padding: '15px',
                                    background: 'rgba(0,0,0,0.6)',
                                    color: 'white',
                                    backdropFilter: 'blur(5px)',
                                    fontWeight: '600'
                                }}>
                                    {livenessMsg}
                                </div>

                                {livenessStatus === 'Success' && (
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '5rem' }}>✅</div>
                                )}
                            </div>

                            <div style={{ marginTop: '25px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                <Button variant="secondary" onClick={() => setShowCameraModal(false)}>Cancel</Button>
                                <Button
                                    variant="primary"
                                    onClick={() => {
                                        const video = videoRef.current;
                                        const canvas = canvasRef.current;
                                        if (video && canvas) {
                                            // Resize to smaller ID card size (320px width)
                                            const width = 320;
                                            const height = (video.videoHeight / video.videoWidth) * width;

                                            canvas.width = width;
                                            canvas.height = height;

                                            canvas.getContext('2d').drawImage(video, 0, 0, width, height);
                                            // Use lower quality jpeg to save space
                                            const photoData = canvas.toDataURL('image/jpeg', 0.7);
                                            markAttendanceWithPhoto(photoData, 'Manual Capture');
                                        }
                                    }}
                                >
                                    📸 Capture & Mark
                                </Button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {viewMode === 'slip' && (
                    <div style={{ marginTop: '30px' }}>
                        <SalarySlip
                            employee={employeeData}
                            payrollData={payslipData?.earnings ? { ...payslipData.earnings, tax: payslipData.deductions?.taxPercent, pf: payslipData.deductions?.pf } : employeeData?.payroll}
                            stats={stats}
                            onBack={() => setSearchParams({ v: 'overview' })}
                        />
                    </div>
                )}

                {viewMode === 'overview' && (
                    <>
                        {/* DAILY VOICE VERIFICATION */}
                        <div className="fly-card" style={{ padding: "20px", marginBottom: "20px" }}>
                            <h3 style={{ marginBottom: "10px", fontSize: "1rem" }}>
                                🎙️ Daily Voice Verification
                            </h3>

                            <p style={{
                                background: "#f1f5f9",
                                padding: "10px",
                                borderRadius: "8px",
                                fontWeight: "700",
                                textAlign: "center",
                                marginBottom: "15px"
                            }}>
                                "{dailyText}"
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                                {!textVerified ? (
                                    <Button
                                        onClick={() => {
                                            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                                                alert("Your browser does not support voice recognition. Please use Chrome or Edge.");
                                                return;
                                            }

                                            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                                            const recognition = new SpeechRecognition();

                                            recognition.lang = 'en-US';
                                            recognition.interimResults = false;
                                            recognition.maxAlternatives = 1;

                                            setTypedText("Listening..."); // Reusing typedText state for status/feedback

                                            recognition.onstart = () => {
                                                // setIsListening(true); // You can add this state if needed for UI styling
                                            };

                                            recognition.onresult = (event) => {
                                                const transcript = event.results[0][0].transcript;
                                                setTypedText(transcript); // Show what was heard
                                            };

                                            recognition.onerror = (event) => {
                                                console.error("Speech recognition error", event.error);
                                                setTypedText("Error: " + event.error);
                                            };

                                            recognition.onend = () => {
                                                // setIsListening(false);
                                            };

                                            recognition.start();
                                        }}
                                        style={{
                                            background: 'var(--primary)',
                                            color: 'white',
                                            padding: '12px 24px',
                                            borderRadius: '50px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontSize: '1rem'
                                        }}
                                    >
                                        🎙️ Tap to Read Aloud
                                    </Button>
                                ) : (
                                    <div style={{ fontSize: '1.2rem', color: '#16a34a', fontWeight: 'bold' }}>
                                        ✅ Verified
                                    </div>
                                )}

                                {typedText && (
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Heard:</p>
                                        <p style={{ fontSize: '1rem', fontStyle: 'italic', fontWeight: '600', color: 'var(--text-main)' }}>
                                            "{typedText}"
                                        </p>
                                    </div>
                                )}

                                <p style={{
                                    marginTop: "6px",
                                    fontSize: "0.75rem",
                                    color: textVerified ? "#16a34a" : "#ef4444",
                                    fontWeight: "600"
                                }}>
                                    {textVerified ? "✅ Voice matched successfully" : (typedText && typedText !== "Listening..." ? "❌ Phrase does not match. Try again." : "")}
                                </p>
                            </div>
                        </div>

                        <Button
        onClick={() => setShowCameraModal(true)}
        disabled={!canMarkAttendance || !textVerified || attendance[today] === 'P'}
        style={{
            background: (canMarkAttendance && textVerified && attendance[today] !== 'P')
                ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                : '#9ca3af',
            color: 'white',
            cursor: (canMarkAttendance && textVerified && attendance[today] !== 'P') ? 'pointer' : 'not-allowed'
        }}
    >
        {attendance[today] === 'P' ? '✅ Attendance Already Marked' : '🕘 Mark Attendance'}
    </Button>

                        <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', marginBottom: '5px' }}>
                            📡 Database: {allLocations.length > 0 ? `Connected (${allLocations.length} Locations)` : 'Connecting / Empty'}
                            {USE_MOCK_LOCATION && <span style={{ color: '#f59e0b', marginLeft: '10px' }}>⚠️ Mock GPS On</span>}
                        </p>

                        <p style={{ fontSize: '0.8rem', color: '#ef4444' }}>
                            {locationMsg}
                        </p>

                        <div className="fly-card" style={{ marginBottom: '30px', padding: '30px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h2 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.8rem', fontWeight: '800' }}>Financial Insights</h2>
                                <div style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: '700', background: 'var(--secondary)', padding: '6px 16px', borderRadius: '50px' }}>
                                    Attendance: {stats.present} / {stats.totalDays} Days
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' }}>
                                <div style={{
                                    padding: '30px',
                                    background: 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)',
                                    borderRadius: 'var(--radius)',
                                    color: 'white',
                                    boxShadow: 'var(--shadow-lg)'
                                }}>
                                    <h3 style={{ fontSize: '0.9rem', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '800' }}>Net Earnings</h3>
                                    <p style={{ fontSize: '3.5rem', fontWeight: '900', marginTop: '15px', letterSpacing: '-1px' }}>₹{payrollResults.netPayable.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                    <span style={{
                                        display: 'inline-block',
                                        marginTop: '10px',
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        background: 'rgba(255,255,255,0.2)',
                                        color: 'white',
                                        fontSize: '0.8rem',
                                        fontWeight: '600'
                                    }}>Based on current attendance</span>
                                </div>

                                <div style={{
                                    padding: '30px',
                                    background: '#fff',
                                    borderRadius: 'var(--radius)',
                                    border: '1px solid var(--border-color)',
                                    boxShadow: 'var(--shadow-sm)'
                                }}>
                                    <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Gross Salary (Full)</h3>
                                    <p style={{ fontSize: '3rem', fontWeight: '700', color: 'var(--text-main)', marginTop: '10px' }}>₹{payrollResults.gross.toLocaleString()}</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '15px' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Basic: ₹{payrollResults.breakdown.basic || 0}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>HRA: ₹{payrollResults.breakdown.h || 0}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Spl: ₹{payrollResults.breakdown.spl || 0}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Travel: ₹{payrollResults.breakdown.travel || 0}</div>
                                    </div>
                                </div>

                                <div style={{
                                    padding: '30px',
                                    background: '#fff',
                                    borderRadius: 'var(--radius)',
                                    border: '1px solid var(--border-color)',
                                    boxShadow: 'var(--shadow-sm)'
                                }}>
                                    <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Total Deductions</h3>
                                    <p style={{ fontSize: '3rem', fontWeight: '700', color: '#ef4444', marginTop: '10px' }}>₹{payrollResults.deductions.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                    <div style={{ marginTop: '15px' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tax ({payrollResults.taxRate}%): ₹{payrollResults.tax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>PF Contribution: ₹{payrollResults.pf.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Leave Balance Summary */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                            {[
                                { label: 'Casual', key: 'casual', icon: '🏝️', color: '#f59e0b', bg: '#fffbeb' },
                                { label: 'Sick', key: 'sick', icon: '🤒', color: '#dc2626', bg: '#fef2f2' },
                                { label: 'Earned', key: 'earned', icon: '💼', color: '#0284c7', bg: '#f0f9ff' }
                            ].map(item => (
                                <div key={item.key} className="fly-card" style={{
                                    padding: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '15px',
                                    background: 'white',
                                    borderLeft: `5px solid ${item.color}`,
                                    borderRadius: '16px'
                                }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: item.bg,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.2rem'
                                    }}>
                                        {item.icon}
                                    </div>
                                    <div>
                                        <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>{item.label}</p>
                                        <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>
                                            {employeeData.leaveBalances ? employeeData.leaveBalances[item.key] : 0} <span style={{ fontSize: '0.7rem', fontWeight: '500', color: '#94a3b8' }}>DAYS</span>
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Attendance Summary Bar */}
                        <div className="glass-panel" style={{ padding: '20px' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '15px' }}>Monthly Attendance Record</h3>

                            {/* Days Header */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '8px' }}>
                                {weekdayShort.map(w => (
                                    <div key={w} style={{ textAlign: 'center', fontWeight: 700, padding: '4px 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{w}</div>
                                ))}
                            </div>

                            {/* Calendar Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                                {(() => {
                                    const firstWeekday = new Date(year, month, 1).getDay();
                                    const gridCells = [];

                                    // Empty cells for offset
                                    for (let i = 0; i < firstWeekday; i++) {
                                        gridCells.push(<div key={`empty-${i}`} />);
                                    }

                                    // Day cells
                                    for (let d = 1; d <= stats.totalDays; d++) {
                                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                        const status = attendance[dateStr];
                                        const dateObj = new Date(year, month, d);
                                        const dayName = weekdayShort[dateObj.getDay()];

                                        let bg = 'transparent';
                                        let borderTop = '1px solid var(--border-color)';

                                        if (status === 'P') {
                                            bg = '#dcfce7'; // Light green
                                            borderTop = '3px solid #16a34a';
                                        } else if (status === 'A') {
                                            bg = '#fee2e2'; // Light red
                                            borderTop = '3px solid #ef4444';
                                        } else if (status === 'L') {
                                            bg = '#ffedd5'; // Light orange
                                            borderTop = '3px solid #f97316';
                                        }

                                        gridCells.push(
                                            <div key={d} style={{
                                                border: '1px solid var(--border-color)',
                                                borderTop: borderTop,
                                                borderRadius: '8px',
                                                padding: '8px',
                                                minHeight: '60px',
                                                background: status ? bg : 'transparent',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                position: 'relative'
                                            }}>
                                                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)' }}>{d}</span>
                                                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '2px' }}>{dayName}</span>
                                                {status && (
                                                    <div style={{
                                                        marginTop: '4px',
                                                        fontSize: '0.6rem',
                                                        fontWeight: '800',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        background: status === 'P' ? '#16a34a' : (status === 'A' ? '#ef4444' : '#f97316'),
                                                        color: 'white'
                                                    }}>
                                                        {status === 'P' ? 'PRESENT' : (status === 'A' ? 'ABSENT' : 'LEAVE')}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }
                                    return gridCells;
                                })()}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', background: '#16a34a', borderRadius: '50%' }}></span> Present ({stats.present})</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', background: '#f97316', borderRadius: '50%' }}></span> Leave ({stats.leave})</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%' }}></span> Absent ({stats.absent})</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', background: '#e2e8f0', borderRadius: '50%' }}></span> Unmarked</span>
                            </div>
                        </div>

                        {/* Leave History Section */}
                        <div className="history-section" style={{ marginTop: '40px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                                <div>
                                    <h2 className="title-gradient" style={{ margin: 0, fontSize: '1.8rem' }}>📤 Leave Portfolio</h2>
                                    <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}>Your time-off journey</p>
                                </div>
                                <div className="filter-btn active" style={{ cursor: 'default' }}>
                                    {myLeaves.length} Total
                                </div>
                            </div>

                            <div style={{ display: 'grid', gap: '20px' }}>
                                {myLeaves.length === 0 ? (
                                    <div className="message-card" style={{ textAlign: 'center', padding: '40px' }}>
                                        <span style={{ fontSize: '3rem', display: 'block', marginBottom: '10px' }}>🌈</span>
                                        <p style={{ color: 'var(--text-muted)', margin: 0, fontWeight: '600' }}>No leave history yet. Ready for a break?</p>
                                    </div>
                                ) : (
                                    myLeaves.map(leave => {
                                        const typeIcon = leave.type === 'Casual' ? '🏝️' : (leave.type === 'Sick' ? '🤒' : (leave.type === 'Earned' ? '💼' : '💸'));
                                        const statusClass = leave.status === 'Approved' ? 'solved' : (leave.status === 'Rejected' ? 'new' : 'open');

                                        return (
                                            <div key={leave._id} className={`message-card ${leave.status === 'Pending' ? 'unread' : ''}`}>
                                                <div className="message-header">
                                                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                                        <div style={{ fontSize: '1.8rem', background: '#f8fafc', width: '55px', height: '55px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                                                            {typeIcon}
                                                        </div>
                                                        <div>
                                                            <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.15rem', fontWeight: '800' }}>{leave.type} Leave</h3>
                                                            <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                                                                {leave.startDate} ➝ {leave.endDate}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                                        <span className={`status-badge status-${statusClass}`}>
                                                            {leave.status}
                                                        </span>
                                                        {leave.status === 'Pending' && (
                                                            <button
                                                                onClick={() => handleLeaveDelete(leave._id)}
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    color: '#ef4444',
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: '700',
                                                                    cursor: 'pointer',
                                                                    padding: '4px 8px',
                                                                    borderRadius: '6px',
                                                                    transition: 'all 0.2s',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px'
                                                                }}
                                                                onMouseOver={(e) => e.target.style.background = '#fee2e2'}
                                                                onMouseOut={(e) => e.target.style.background = 'none'}
                                                            >
                                                                🗑️ Delete
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="response-container" style={{ marginTop: '15px', background: 'rgba(248, 250, 252, 0.5)' }}>
                                                    <p style={{ margin: 0, fontSize: '0.95rem', color: '#475569', lineHeight: '1.6' }}>
                                                        <span style={{ color: '#94a3b8', fontWeight: '700' }}>Reason: </span>
                                                        {leave.reason}
                                                    </p>
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '12px', fontWeight: '600' }}>
                                                    Requested on {new Date(leave.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default EmployeeDashboard;
