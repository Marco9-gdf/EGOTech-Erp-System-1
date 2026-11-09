import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Clock, LogIn, LogOut, CheckCircle2, AlertCircle, Timer, MapPin, RefreshCw, ShieldCheck, ShieldAlert } from 'lucide-react';
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

  const handleClockIn = async () => {
    try {
      setSubmitting(true);
      setError('');
      await api.clockIn({
        notes: notes || 'Web GPS Punch-In',
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
      });
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
            <input
              type="text"
              placeholder="Optional notes (e.g. Office, Remote, Client Site)"
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
    </div>
  );
}
