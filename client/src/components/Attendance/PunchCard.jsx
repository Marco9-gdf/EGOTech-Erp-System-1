import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import {
  Clock,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Timer,
  MapPin,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Camera,
  CameraOff,
  RotateCcw,
  Upload,
  Eye,
  X,
  Sparkles
} from 'lucide-react';
import Badge from '../Common/Badge';

export default function PunchCard({ onPunchChange }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayStatus, setTodayStatus] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [workedDuration, setWorkedDuration] = useState('0h 0m 0s');

  // Geolocation state
  const [coords, setCoords] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('detecting'); // 'detecting' | 'ready' | 'denied' | 'error'
  const [distanceMeters, setDistanceMeters] = useState(null);

  // Remote Employee Verification Selfie state
  const [selfieData, setSelfieData] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Real-time ticking clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }
    setGpsStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLon = pos.coords.longitude;
        setCoords({ latitude: userLat, longitude: userLon });
        setGpsStatus('ready');
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setGpsStatus(err.code === 1 ? 'denied' : 'error');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  };

  useEffect(() => {
    detectLocation();
  }, []);

  // Compute distance when coords or company settings are loaded
  useEffect(() => {
    if (coords && companySettings?.office_latitude && companySettings?.office_longitude) {
      const R = 6371000;
      const toRad = (deg) => (deg * Math.PI) / 180;
      const dLat = toRad(companySettings.office_latitude - coords.latitude);
      const dLon = toRad(companySettings.office_longitude - coords.longitude);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(coords.latitude)) * Math.cos(toRad(companySettings.office_latitude)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      setDistanceMeters(Math.round(R * c));
    }
  }, [coords, companySettings]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const [res, comp] = await Promise.all([
        api.getTodayStatus(),
        api.getCompanySettings().catch(() => ({ company: {} })),
      ]);
      setTodayStatus(res);
      setCompanySettings(comp.company || {});
      setError('');
    } catch (err) {
      console.error('Failed to get today attendance status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Calculate live working duration if clocked in
  useEffect(() => {
    if (todayStatus?.record?.clock_in && !todayStatus?.record?.clock_out) {
      const interval = setInterval(() => {
        const [h, m, s = 0] = todayStatus.record.clock_in.split(':').map(Number);
        const punchTime = new Date();
        punchTime.setHours(h, m, s, 0);

        const now = new Date();
        let diffMs = now - punchTime;
        if (diffMs < 0) diffMs = 0;

        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

        setWorkedDuration(`${hours}h ${minutes}m ${seconds}s`);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [todayStatus]);

  // Camera cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setCameraError('');
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraError('Webcam permission not granted or device has no camera. You can upload a photo instead.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');

      // Mirror horizontally for natural selfie orientation
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform for watermark text

      // Watermark bar at bottom
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.fillRect(0, canvas.height - 44, canvas.width, 44);

      // Security watermark text
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('✓ EGOTECH WORKFORCE VERIFICATION', 14, canvas.height - 25);

      ctx.fillStyle = '#f1f5f9';
      ctx.font = '10px monospace';
      const locText = coords ? ` • GPS: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` : '';
      ctx.fillText(`${new Date().toLocaleString()}${locText}`, 14, canvas.height - 10);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setSelfieData(dataUrl);
      stopCamera();
    } catch (e) {
      console.error('Error capturing selfie:', e);
      setCameraError('Failed to capture photo frame.');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file (JPG, PNG).');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelfieData(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClockIn = async () => {
    try {
      setSubmitting(true);
      setError('');
      await api.clockIn({
        notes: notes || (selfieData ? 'Remote Verified Selfie Punch-In' : 'Web Punch-In'),
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        selfie_url: selfieData ?? null,
      });
      setSelfieData(null);
      await fetchStatus();
      if (onPunchChange) onPunchChange();
    } catch (err) {
      setError(err.message || 'Failed to clock in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setSubmitting(true);
      setError('');
      await api.clockOut({
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
      });
      await fetchStatus();
      if (onPunchChange) onPunchChange();
    } catch (err) {
      setError(err.message || 'Failed to clock out.');
    } finally {
      setSubmitting(false);
    }
  };

  const isClockedIn = todayStatus?.clockedIn;
  const isClockedOut = todayStatus?.clockedOut;
  const record = todayStatus?.record;

  const geofenceRadius = Number(companySettings?.geofence_radius_meters) || 200;
  const isWithinGeofence = distanceMeters != null ? distanceMeters <= geofenceRadius : true;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] p-6 flex flex-col justify-between hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05),0_8px_10px_-6px_rgba(0,0,0,0.03)] transition-all">
      {/* Top Banner */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Attendance Terminal</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {currentTime.toLocaleDateString(undefined, {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-slate-900 text-emerald-400 font-mono font-bold text-sm tracking-wider rounded-xl shadow-inner border border-slate-800">
              {currentTime.toLocaleTimeString()}
            </span>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* GPS Geofence Radar Status */}
        <div className="mt-4 p-3 rounded-xl border border-slate-200/70 bg-slate-50/80 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            {gpsStatus === 'detecting' && (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                <span className="text-slate-500 font-medium">Detecting office GPS perimeter...</span>
              </>
            )}

            {gpsStatus === 'ready' && (
              <>
                {companySettings?.office_latitude && distanceMeters != null ? (
                  isWithinGeofence ? (
                    <div className="flex items-center space-x-1.5 text-emerald-700 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Within Office Perimeter ({distanceMeters}m • Max {geofenceRadius}m)</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5 text-amber-700 font-semibold">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Outside Office Bounds ({distanceMeters}m • Max {geofenceRadius}m)</span>
                    </div>
                  )
                ) : (
                  <div className="flex items-center space-x-1.5 text-slate-700 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>GPS Active ({coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)})</span>
                  </div>
                )}
              </>
            )}

            {(gpsStatus === 'denied' || gpsStatus === 'error') && (
              <div className="flex items-center space-x-1.5 text-slate-500">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>GPS permission not granted</span>
              </div>
            )}
          </div>

          <button
            onClick={detectLocation}
            title="Refresh GPS"
            className="p-1 text-slate-400 hover:text-indigo-600 rounded-md cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Punch State Details */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-100">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Punch In</p>
            <p className="mt-1 text-sm font-bold text-slate-800 font-mono">
              {record?.clock_in || '--:--:--'}
            </p>
            {record?.is_late ? (
              <span className="mt-1 inline-block text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                Late Arrival
              </span>
            ) : null}
            {record?.distance_meters != null && (
              <p className="text-[10px] text-slate-400 mt-0.5">
                {record.distance_meters}m from office
              </p>
            )}
            {record?.selfie_url && (
              <button
                type="button"
                onClick={() => setPreviewModalOpen(true)}
                className="mt-2 inline-flex items-center space-x-1.5 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold border border-emerald-200 cursor-pointer transition"
              >
                <img
                  src={record.selfie_url}
                  alt="Punch selfie"
                  className="w-4 h-4 rounded-full object-cover border border-emerald-400"
                />
                <span>Verified Selfie</span>
                <Eye className="w-3 h-3 text-emerald-600" />
              </button>
            )}
          </div>

          <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-100">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Punch Out</p>
            <p className="mt-1 text-sm font-bold text-slate-800 font-mono">
              {record?.clock_out || '--:--:--'}
            </p>
            {record?.working_hours > 0 ? (
              <span className="mt-1 inline-block text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                {record.working_hours} hrs logged
              </span>
            ) : null}
          </div>
        </div>

        {/* Live Timer if currently clocked in */}
        {isClockedIn && (
          <div className="mt-4 p-3 bg-indigo-50/80 border border-indigo-200/70 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2 text-indigo-800">
              <Timer className="w-4 h-4 animate-pulse text-indigo-600" />
              <span className="text-xs font-bold">Active Session:</span>
            </div>
            <span className="text-sm font-mono font-extrabold text-indigo-900 bg-white px-2.5 py-0.5 rounded-lg border border-indigo-200/80 shadow-2xs">
              {workedDuration}
            </span>
          </div>
        )}
      </div>

      {/* Action Button Section */}
      <div className="mt-6">
        {loading ? (
          <div className="h-11 w-full bg-slate-100 animate-pulse rounded-xl" />
        ) : isClockedOut ? (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center space-x-2 text-emerald-700 shadow-2xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-bold">Today's Shift Completed</span>
          </div>
        ) : isClockedIn ? (
          <button
            onClick={handleClockOut}
            disabled={submitting}
            className="w-full py-3 px-4 bg-linear-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 active:scale-[0.99] text-white rounded-xl font-bold text-sm shadow-md shadow-rose-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            <span>{submitting ? 'Clocking Out...' : 'Clock Out Now'}</span>
          </button>
        ) : (
          <div className="space-y-3">
            {/* Remote Workforce Selfie Verification Section */}
            <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Remote Selfie Verification</span>
                </div>
                {selfieData ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    ✓ Verified Photo Ready
                  </span>
                ) : (
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">
                    Remote Work Check-in
                  </span>
                )}
              </div>

              {cameraError && (
                <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-lg mb-2">
                  {cameraError}
                </p>
              )}

              {cameraActive ? (
                <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shadow-md">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-44 object-cover transform -scale-x-100"
                  />
                  {/* Face Guide Target Ring */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-28 h-36 border-2 border-dashed border-emerald-400 rounded-full animate-pulse flex items-center justify-center">
                      <span className="text-[9px] text-emerald-200 bg-slate-900/70 px-2 py-0.5 rounded font-mono font-bold">
                        Align Face
                      </span>
                    </div>
                  </div>

                  <div className="absolute bottom-2 inset-x-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg backdrop-blur cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Take Photo</span>
                    </button>
                  </div>
                </div>
              ) : selfieData ? (
                <div className="flex items-center space-x-3 p-2 bg-emerald-50/80 border border-emerald-200 rounded-xl">
                  <img
                    src={selfieData}
                    alt="Captured Selfie"
                    className="w-12 h-12 rounded-lg object-cover border-2 border-emerald-500 shadow-xs"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Selfie Stamped & Ready</span>
                    </p>
                    <p className="text-[10px] text-emerald-700">
                      Auto-watermarked with GPS & time seal
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelfieData(null); startCamera(); }}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg text-xs font-semibold cursor-pointer border border-transparent hover:border-slate-200 transition"
                    title="Retake Photo"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex-1 py-2 px-3 bg-white hover:bg-indigo-50/80 border border-slate-200 hover:border-indigo-300 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Open Camera for Selfie</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer shadow-2xs"
                    title="Upload selfie if webcam unavailable"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            <input
              type="text"
              placeholder="Optional notes (e.g. Work From Home, Client Visit, Office)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50/50 hover:bg-white"
            />
            <button
              onClick={handleClockIn}
              disabled={submitting}
              className="w-full py-3 px-4 bg-linear-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 active:scale-[0.99] text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{submitting ? 'Clocking In...' : 'Clock In Now'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Selfie Preview Modal */}
      {previewModalOpen && record?.selfie_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in duration-150">
            <button
              onClick={() => setPreviewModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h4 className="font-bold text-slate-900 text-sm mb-1">
              Verified Attendance Selfie
            </h4>
            <p className="text-[11px] text-slate-500 mb-3">
              Clock-in photo taken at {record.clock_in} on {record.date}
            </p>
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-900">
              <img
                src={record.selfie_url}
                alt="Attendance Selfie"
                className="w-full h-auto max-h-72 object-contain"
              />
            </div>
            <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Verification Seal:</span>
                <span className="font-mono font-bold text-emerald-600">EGOTECH-WATERMARK-OK</span>
              </div>
              {record.distance_meters != null && (
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Location Distance:</span>
                  <span className="font-semibold">{record.distance_meters}m from office</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
