import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import PunchCard from '../components/Attendance/PunchCard';
import AttendanceCalendar from '../components/Attendance/AttendanceCalendar';
import Badge from '../components/Common/Badge';
import Modal from '../components/Common/Modal';
import ConfirmModal from '../components/Common/ConfirmModal';
import {
  Calendar,
  Clock,
  Filter,
  CheckCircle,
  Plus,
  Users,
  Search,
  Check,
  AlertCircle,
  CalendarCheck,
  Radio,
  Cpu,
  Server,
  Wifi,
  Trash2,
  Zap,
} from 'lucide-react';

export default function Attendance() {
  const { isHr } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState(isHr ? 'master' : 'my');
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  // Master Attendance State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [masterData, setMasterData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [masterLoading, setMasterLoading] = useState(true);

  // Manual Punch Modal State
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [modalEmployeeId, setModalEmployeeId] = useState('');
  const [modalClockIn, setModalClockIn] = useState('09:00:00');
  const [modalClockOut, setModalClockOut] = useState('18:00:00');
  const [modalStatus, setModalStatus] = useState('Present');
  const [modalNotes, setModalNotes] = useState('');
  const [modalIsLate, setModalIsLate] = useState(false);
  const [submittingManual, setSubmittingManual] = useState(false);

  // My Attendance State
  const [myMonth, setMyMonth] = useState(new Date().getMonth() + 1);
  const [myYear, setMyYear] = useState(new Date().getFullYear());
  const [myData, setMyData] = useState(null);
  const [myLoading, setMyLoading] = useState(true);

  // Biometric Hardware Machines State
  const [biometricDevices, setBiometricDevices] = useState([]);
  const [loadingBiometric, setLoadingBiometric] = useState(false);
  const [addDeviceModalOpen, setAddDeviceModalOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({
    device_name: '',
    device_model: 'ZKTeco K40 / SilkBio-101',
    serial_number: '',
    ip_address: '192.168.1.130',
    port: 4370,
    location: 'Headquarters Main Gate',
  });
  const [simEmployeeId, setSimEmployeeId] = useState('');
  const [simPunchType, setSimPunchType] = useState('clock_in');
  const [simDeviceId, setSimDeviceId] = useState('');
  const [simulatingPunch, setSimulatingPunch] = useState(false);
  const [employeesList, setEmployeesList] = useState([]);

  const fetchBiometricDevices = async () => {
    try {
      setLoadingBiometric(true);
      const res = await api.getBiometricDevices();
      setBiometricDevices(res.devices || []);
      if (res.devices && res.devices.length > 0 && !simDeviceId) {
        setSimDeviceId(res.devices[0].id);
      }
    } catch (e) {
      // non-fatal
    } finally {
      setLoadingBiometric(false);
    }
  };

  const handleRegisterDevice = async (e) => {
    e.preventDefault();
    try {
      await api.registerBiometricDevice(newDevice);
      toast.success('Biometric device registered successfully.', 'Device Added');
      setAddDeviceModalOpen(false);
      setNewDevice({
        device_name: '',
        device_model: 'ZKTeco K40 / SilkBio-101',
        serial_number: '',
        ip_address: '192.168.1.130',
        port: 4370,
        location: 'Office Entrance',
      });
      fetchBiometricDevices();
    } catch (err) {
      toast.error(err.message || 'Failed to register biometric device.');
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    try {
      await api.deleteBiometricDevice(deviceId);
      toast.success('Biometric device deregistered.', 'Device Removed');
      fetchBiometricDevices();
    } catch (err) {
      toast.error(err.message || 'Failed to remove biometric device.');
    }
  };

  const handleSimulatePunch = async () => {
    if (!simDeviceId || !simEmployeeId) {
      toast.warning('Please select a biometric machine and an employee.', 'Missing Selection');
      return;
    }
    try {
      setSimulatingPunch(true);
      const res = await api.simulateBiometricPunch(simDeviceId, {
        employee_id: simEmployeeId,
        punch_type: simPunchType,
      });
      toast.success(res.message, 'Biometric Punch Synced');
      fetchBiometricDevices();
      fetchMaster();
    } catch (err) {
      toast.error(err.message || 'Failed to simulate punch.');
    } finally {
      setSimulatingPunch(false);
    }
  };

  // Fetch Master Attendance
  const fetchMaster = async () => {
    try {
      setMasterLoading(true);
      const res = await api.getMasterAttendance(selectedDate, selectedDept, selectedStatus);
      setMasterData(res);
    } catch (err) {
      console.error('Failed to load master attendance:', err);
    } finally {
      setMasterLoading(false);
    }
  };

  // Fetch My Attendance
  const fetchMy = async () => {
    try {
      setMyLoading(true);
      const res = await api.getMyAttendance(myMonth, myYear);
      setMyData(res);
    } catch (err) {
      console.error('Failed to load my attendance:', err);
    } finally {
      setMyLoading(false);
    }
  };

  useEffect(() => {
    api.getDepartments().then((res) => setDepartments(res.departments || [])).catch(() => {});
    if (isHr) {
      fetchBiometricDevices();
      api.getEmployees().then((res) => {
        const emps = res.employees || [];
        setEmployeesList(emps);
        if (emps.length > 0 && !simEmployeeId) {
          setSimEmployeeId(emps[0].id);
        }
      }).catch(() => {});
    }
  }, [isHr]);

  useEffect(() => {
    if (activeTab === 'master' && isHr) {
      fetchMaster();
    } else if (activeTab === 'biometric' && isHr) {
      fetchBiometricDevices();
    } else {
      fetchMy();
    }
  }, [activeTab, selectedDate, selectedDept, selectedStatus, myMonth, myYear]);

  const handleBulkMarkPresent = () => {
    setBulkConfirmOpen(true);
  };

  const handleConfirmBulkMark = async () => {
    try {
      await api.bulkMarkAttendance({ date: selectedDate, status: 'Present' });
      toast.success(`All active staff marked as Present for ${selectedDate}.`, 'Attendance Updated');
      setBulkConfirmOpen(false);
      fetchMaster();
    } catch (err) {
      toast.error(err.message || 'Failed to bulk mark attendance.');
    }
  };

  const handleOpenManualModal = (emp = null) => {
    if (emp) {
      setModalEmployeeId(emp.employee_id);
      setModalClockIn(emp.clock_in || '09:00:00');
      setModalClockOut(emp.clock_out || '18:00:00');
      setModalStatus(emp.attendance_status || 'Present');
      setModalNotes(emp.notes || '');
      setModalIsLate(Boolean(emp.is_late));
    } else {
      setModalEmployeeId(masterData?.records?.[0]?.employee_id || '');
      setModalClockIn('09:00:00');
      setModalClockOut('18:00:00');
      setModalStatus('Present');
      setModalNotes('');
      setModalIsLate(false);
    }
    setManualModalOpen(true);
  };

  const handleSaveManualAttendance = async (e) => {
    e.preventDefault();
    try {
      setSubmittingManual(true);
      await api.markAttendanceManual({
        employee_id: modalEmployeeId,
        date: selectedDate,
        clock_in: modalClockIn,
        clock_out: modalClockOut,
        status: modalStatus,
        is_late: modalIsLate,
        notes: modalNotes,
      });
      toast.success('Manual punch log updated successfully.', 'Attendance Saved');
      setManualModalOpen(false);
      fetchMaster();
    } catch (err) {
      toast.error(err.message || 'Failed to update attendance.');
    } finally {
      setSubmittingManual(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Attendance Center</h2>
          <p className="text-xs text-slate-500">Track daily clock-ins, working hours, and master attendance logs</p>
        </div>

        {isHr && (
          <div className="flex items-center p-1 bg-slate-200/60 rounded-xl">
            <button
              onClick={() => setActiveTab('master')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'master'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Master Attendance View
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'my'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Attendance
            </button>
            <button
              onClick={() => setActiveTab('biometric')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'biometric'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-indigo-600" />
              <span>Biometric Machines</span>
            </button>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* TAB 1: MASTER ATTENDANCE DASHBOARD (HR / ADMIN)                     */}
      {/* =================================================================== */}
      {activeTab === 'master' && isHr && (
        <div className="space-y-6">
          {/* Filter Bar & Quick Actions */}
          <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Picker */}
              <div className="flex items-center space-x-1.5">
                <span className="text-xs text-slate-500 font-medium">Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Department Filter */}
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Half Day">Half Day</option>
                <option value="On Leave">On Leave</option>
                <option value="Absent">Absent</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleBulkMarkPresent}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Bulk Mark Present</span>
              </button>

              <button
                onClick={() => handleOpenManualModal(null)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Manual Override</span>
              </button>
            </div>
          </div>

          {/* Today Stats Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 bg-white rounded-xl border border-slate-100 shadow-xs text-center">
              <p className="text-xl font-bold text-slate-800">{masterData?.stats?.total_active || 0}</p>
              <p className="text-[11px] text-slate-500 font-medium">Total Staff</p>
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-slate-100 shadow-xs text-center">
              <p className="text-xl font-bold text-emerald-600">
                {(masterData?.stats?.present_count || 0) + (masterData?.stats?.half_day_count || 0)}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">Present</p>
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-slate-100 shadow-xs text-center">
              <p className="text-xl font-bold text-orange-600">{masterData?.stats?.late_count || 0}</p>
              <p className="text-[11px] text-slate-500 font-medium">Late Marks</p>
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-slate-100 shadow-xs text-center">
              <p className="text-xl font-bold text-blue-600">{masterData?.stats?.on_leave_count || 0}</p>
              <p className="text-[11px] text-slate-500 font-medium">On Leave</p>
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-slate-100 shadow-xs text-center">
              <p className="text-xl font-bold text-rose-600">{masterData?.stats?.absent_count || 0}</p>
              <p className="text-[11px] text-slate-500 font-medium">Absent</p>
            </div>
          </div>

          {/* Master Records Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">
                Workforce Attendance for {selectedDate}
              </h3>
              <span className="text-xs text-slate-400">
                {masterData?.records?.length || 0} employees found
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department & Shift</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Clock In</th>
                    <th className="py-3 px-4">Clock Out</th>
                    <th className="py-3 px-4">Hours</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {masterLoading ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-400">
                        Loading attendance records...
                      </td>
                    </tr>
                  ) : masterData?.records?.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-400">
                        No records matching the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    masterData?.records?.map((rec) => (
                      <tr key={rec.employee_id} className="hover:bg-slate-50/60">
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800">
                            {rec.first_name} {rec.last_name}
                          </p>
                          <p className="text-[10px] text-slate-400">{rec.employee_code}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-slate-700">{rec.department_name || 'N/A'}</p>
                          <p className="text-[10px] text-slate-400">{rec.shift_name}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge status={rec.attendance_status} />
                          {rec.is_late ? (
                            <span className="ml-1 text-[10px] font-bold text-amber-600">Late</span>
                          ) : null}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                          {rec.clock_in || '--'}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                          {rec.clock_out || '--'}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {rec.working_hours ? `${rec.working_hours}h` : '--'}
                          {rec.overtime_hours > 0 ? (
                            <span className="ml-1 text-[10px] text-emerald-600">
                              (+{rec.overtime_hours}h OT)
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">
                          {rec.notes || '--'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleOpenManualModal(rec)}
                            className="px-2.5 py-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                          >
                            Edit Punch
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: MY ATTENDANCE VIEW (EMPLOYEE / HR SELF-SERVICE)              */}
      {/* =================================================================== */}
      {activeTab === 'my' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Punch Card */}
            <div className="lg:col-span-1">
              <PunchCard onPunchChange={fetchMy} />
            </div>

            {/* Right: Monthly Calendar View */}
            <div className="lg:col-span-2">
              <AttendanceCalendar
                records={myData?.records || []}
                selectedMonth={myMonth}
                selectedYear={myYear}
                onMonthChange={(m, y) => {
                  setMyMonth(m);
                  setMyYear(y);
                }}
              />
            </div>
          </div>

          {/* Month Summary KPI */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-xs text-center">
              <p className="text-2xl font-bold text-slate-800">{myData?.summary?.presentDays || 0}</p>
              <p className="text-xs text-slate-500 font-medium">Days Present</p>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-xs text-center">
              <p className="text-2xl font-bold text-amber-600">{myData?.summary?.lateDays || 0}</p>
              <p className="text-xs text-slate-500 font-medium">Late Marks</p>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-xs text-center">
              <p className="text-2xl font-bold text-indigo-600">{myData?.summary?.totalWorkedHours || 0} hrs</p>
              <p className="text-xs text-slate-500 font-medium">Total Worked Hours</p>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-xs text-center">
              <p className="text-2xl font-bold text-emerald-600">{myData?.summary?.totalOvertimeHours || 0} hrs</p>
              <p className="text-xs text-slate-500 font-medium">Overtime Logged</p>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: BIOMETRIC HARDWARE MACHINES & PUSH SDK (HR / ADMIN)          */}
      {/* =================================================================== */}
      {activeTab === 'biometric' && isHr && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-xs flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <Radio className="w-5 h-5 text-indigo-600 animate-pulse" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{biometricDevices.length}</p>
                <p className="text-xs text-slate-500 font-medium">Registered Terminals</p>
              </div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-xs flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <Wifi className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <p className="text-sm font-bold text-slate-800">ADMS Push Listener Online</p>
                </div>
                <p className="text-[11px] text-slate-500 font-mono">Port 5000 • /api/biometric/cdata</p>
              </div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-xs flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                <Cpu className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">ZKTeco • eSSL • Realtime</p>
                <p className="text-xs text-slate-500 font-medium">Multi-Biometric & Face Support</p>
              </div>
            </div>
          </div>

          {/* Interactive Simulation & Test Panel */}
          <div className="p-6 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-2xl text-white shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2.5">
                <Zap className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Live Biometric Machine Simulator</h3>
                  <p className="text-xs text-slate-300">Simulate real-time hardware clock-in/out from any turnstile or terminal</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAddDeviceModalOpen(true)}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/20 transition cursor-pointer flex items-center space-x-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Hardware Terminal</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Terminal</label>
                <select
                  value={simDeviceId}
                  onChange={(e) => setSimDeviceId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-white focus:outline-hidden"
                >
                  {biometricDevices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.device_name} ({d.serial_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Employee Punching</label>
                <select
                  value={simEmployeeId}
                  onChange={(e) => setSimEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-white focus:outline-hidden"
                >
                  {employeesList.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Punch Type</label>
                <select
                  value={simPunchType}
                  onChange={(e) => setSimPunchType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-white focus:outline-hidden"
                >
                  <option value="clock_in">Clock In (Morning Ingress)</option>
                  <option value="clock_out">Clock Out (Evening Egress)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleSimulatePunch}
                  disabled={simulatingPunch || biometricDevices.length === 0}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <Zap className={`w-4 h-4 ${simulatingPunch ? 'animate-spin' : ''}`} />
                  <span>{simulatingPunch ? 'Pushing Punch...' : 'Simulate Hardware Punch'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Connected Terminals Grid */}
          <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Active Hardware Terminals</h3>

            {biometricDevices.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No biometric devices registered yet. Click "Add Hardware Terminal" to connect a machine.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {biometricDevices.map((d) => (
                  <div
                    key={d.id}
                    className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3 relative group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-slate-800 text-xs">{d.device_name}</h4>
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                            {d.status || 'Online'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{d.device_model} • {d.location}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteDevice(d.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Remove Terminal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-xl border border-slate-200/60 font-mono">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase">Serial Number</span>
                        <span className="font-bold text-slate-700">{d.serial_number}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase">IP : Port</span>
                        <span className="text-slate-700">{d.ip_address}:{d.port || 4370}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>Last Ingested Sync:</span>
                      <span className="font-semibold text-slate-600 font-mono">
                        {d.last_sync_at ? new Date(d.last_sync_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Never'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Network Configuration Guide for IT Admin */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Server className="w-4 h-4 text-indigo-600" />
              Machine Setup Instruction (ZKTeco / eSSL ADMS Configuration)
            </h4>
            <p className="text-[11px]">
              On your physical terminal keypad, navigate to: <span className="font-semibold">Menu → Comm. → Cloud Server Setting (or ADMS Setting)</span>.
            </p>
            <div className="p-2.5 bg-slate-900 rounded-xl text-slate-200 font-mono text-[11px] space-y-1">
              <div><span className="text-slate-500">Server Address:</span> your-server-ip (or localhost in dev)</div>
              <div><span className="text-slate-500">Server Port:</span> 5000</div>
              <div><span className="text-slate-500">Push Path:</span> /api/biometric/cdata</div>
            </div>
          </div>
        </div>
      )}

      {/* Add Biometric Device Modal */}
      <Modal
        isOpen={addDeviceModalOpen}
        onClose={() => setAddDeviceModalOpen(false)}
        title="Register Biometric Terminal (Push ADMS)"
      >
        <form onSubmit={handleRegisterDevice} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Terminal Friendly Name</label>
            <input
              type="text"
              placeholder="e.g. Main Gate Turnstile Terminal"
              value={newDevice.device_name}
              onChange={(e) => setNewDevice({ ...newDevice, device_name: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hardware Model</label>
              <input
                type="text"
                placeholder="e.g. ZKTeco K40 / SilkBio-101"
                value={newDevice.device_model}
                onChange={(e) => setNewDevice({ ...newDevice, device_model: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Device Serial Number (SN)</label>
              <input
                type="text"
                placeholder="e.g. ZKT-9824-MUM-01"
                value={newDevice.serial_number}
                onChange={(e) => setNewDevice({ ...newDevice, serial_number: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg uppercase"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Device IP Address</label>
              <input
                type="text"
                placeholder="192.168.1.130"
                value={newDevice.ip_address}
                onChange={(e) => setNewDevice({ ...newDevice, ip_address: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
              <input
                type="text"
                placeholder="e.g. Headquarters Reception"
                value={newDevice.location}
                onChange={(e) => setNewDevice({ ...newDevice, location: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setAddDeviceModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
            >
              Register Terminal
            </button>
          </div>
        </form>
      </Modal>

      {/* Manual Attendance Override Modal */}
      <Modal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        title="Manual Attendance Override"
      >
        <form onSubmit={handleSaveManualAttendance} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Employee</label>
            <select
              value={modalEmployeeId}
              onChange={(e) => setModalEmployeeId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              required
            >
              {masterData?.records?.map((r) => (
                <option key={r.employee_id} value={r.employee_id}>
                  {r.first_name} {r.last_name} ({r.employee_code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Clock In Time</label>
              <input
                type="time"
                step="1"
                value={modalClockIn}
                onChange={(e) => setModalClockIn(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Clock Out Time</label>
              <input
                type="time"
                step="1"
                value={modalClockOut}
                onChange={(e) => setModalClockOut(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={modalStatus}
                onChange={(e) => setModalStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="Present">Present</option>
                <option value="Half Day">Half Day</option>
                <option value="On Leave">On Leave</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modalIsLate}
                  onChange={(e) => setModalIsLate(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium">Mark as Late Arrival</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">HR Notes / Reason</label>
            <input
              type="text"
              placeholder="e.g. Manual override approved by HR"
              value={modalNotes}
              onChange={(e) => setModalNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="pt-4 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setManualModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingManual}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {submittingManual ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Mark Attendance Confirm Modal */}
      <ConfirmModal
        isOpen={bulkConfirmOpen}
        onClose={() => setBulkConfirmOpen(false)}
        onConfirm={handleConfirmBulkMark}
        title="Bulk Mark Attendance"
        message={`Are you sure you want to mark all active employees as Present for ${selectedDate}? Any existing attendance records for today will be preserved.`}
        confirmText="Mark All Present"
        type="primary"
      />
    </div>
  );
}
