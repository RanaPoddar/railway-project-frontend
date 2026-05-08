import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBoundary from '../../components/ErrorBoundary';
import {
  FaTrain,
  FaClock,
  FaUser,
  FaPhone,
  FaEdit,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowLeft,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaHistory,
  FaFileAlt,
  FaRoute,
} from 'react-icons/fa';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import shiftService from '../../services/shiftService';
import useAuthStore from '../../stores/useAuthStore';
import useToastStore from '../../stores/useToastStore';

dayjs.extend(duration);
dayjs.extend(relativeTime);

const ShiftDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shift, setShift] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(dayjs());
  const [activeTab, setActiveTab] = useState('timeline'); // timeline, alerts, logs
  const [logFilter, setLogFilter] = useState('ALL'); 
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completeFormData, setCompleteFormData] = useState({
    signOffDateTime: '',
    signOffStation: '',
  });

  const canEdit = useAuthStore((state) => state.canEdit);
  const { success, error: showError } = useToastStore();

// utility 
  const calculateDutyHours = (signOnTime) => {
    const signOn = dayjs(signOnTime);
    const now = currentTime;
    const diff = now.diff(signOn);
    const totalHours = Math.floor(diff / (1000 * 60 * 60));
    const totalMinutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
      totalHours: Math.floor(diff / (1000 * 60 * 60)),
      hours: totalHours,
      minutes: totalMinutes,
      formatted: `${totalHours}h ${totalMinutes}m`
    };
  };

  // Fetch shift details
  useEffect(() => {
    const fetchShiftDetails = async () => {
      try {
        setIsLoading(true);
        const response = await shiftService.getShiftById(id);
        
        if (response.success && response.data) {
          // Map 
          const shiftData = {
            ...response.data,
            signOnTime: response.data.signOnDateTime,
            departureTime: response.data.departureDateTime,
            trainArrivalTime: response.data.trainArrivalDateTime,
          };
          setShift(shiftData);
        }
      } catch (err) {
        console.error('Failed to fetch shift details:', err);
        showError('Failed to load shift details');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchShiftDetails();
    }
  }, [id, showError]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getStatusBadge = (status) => {
    const badges = {
      IN_PROGRESS: { color: 'bg-blue-100 text-blue-700 border-blue-300', text: 'In Progress' },
      COMPLETED: { color: 'bg-green-100 text-green-700 border-green-300', text: 'Completed' },
      CANCELLED: { color: 'bg-red-100 text-red-700 border-red-300', text: 'Cancelled' },
      RELIEF_PLANNED: { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', text: 'Relief Planned' },
    };
    return badges[status] || badges.IN_PROGRESS;
  };

  const getAlertSeverityColor = (severity) => {
    const colors = {
      CRITICAL: 'border-red-600 bg-red-50',
      DANGER: 'border-red-500 bg-red-50',
      WARNING: 'border-orange-500 bg-orange-50',
      ALERT: 'border-yellow-500 bg-yellow-50',
      CAUTION: 'border-blue-500 bg-blue-50',
      NORMAL: 'border-green-500 bg-green-50',
    };
    return colors[severity] || colors.NORMAL;
  };

  const getLogTypeIcon = (logType) => {
    const icons = {
      SIGN_ON: FaCalendarAlt,
      TAKE_OVER: FaTrain,
      DEPARTURE: FaRoute,
      ARRIVAL: FaMapMarkerAlt,
      RELIEF: FaExclamationTriangle,
      SIGN_OFF: FaCheckCircle,
      ALERT: FaExclamationTriangle,
      NOTE: FaFileAlt,
    };
    return icons[logType] || FaFileAlt;
  };

  const handleEdit = () => {
    navigate(`/dashboard/shifts/${id}/edit`);
  };

  const handleComplete = () => {
    // Set default values
    setCompleteFormData({
      signOffDateTime: dayjs().format('YYYY-MM-DDTHH:mm'),
      signOffStation: shift.signOnStation || '',
    });
    setShowCompleteModal(true);
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      // Convert to ISO format - backend expects signOffDateTime (combined)
      const signOffData = {
        signOffDateTime: dayjs(completeFormData.signOffDateTime).toISOString(),
        signOffStation: completeFormData.signOffStation,
        status: 'COMPLETED', // Mark shift as completed
      };

      console.log('📤 Completing shift with data:', signOffData);

      const response = await shiftService.updateShift(id, signOffData);
      
      if (response.success) {
        success('Shift completed successfully');
        setShift({ ...shift, status: 'COMPLETED', ...response.data });
        setShowCompleteModal(false);
      }
    } catch (err) {
      console.error('❌ Failed to complete shift:', err);
      showError(err.response?.data?.message || 'Failed to complete shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteModalClose = () => {
    setShowCompleteModal(false);
  };

  const handleCallPhone = (phone) => {
    window.location.href = `tel:${phone}`;
  };

  const filteredLogs = shift?.logs?.filter(log => 
    logFilter === 'ALL' || log.logType === logFilter
  ) || [];

  const displayAlerts = shift?.alerts || [];
  const displayLogs = shift?.logs || [];

  if (isLoading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  if (!shift) {
    return (
      <Layout>
        <div className="text-center py-12">
          <FaExclamationTriangle className="text-6xl text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Shift Not Found</h2>
          <p className="text-gray-500 mb-6">The shift you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/dashboard/active-shifts')}
            className="px-6 py-2 bg-[#003d82] text-white rounded-md hover:bg-[#002b5c]"
          >
            Back to Active Shifts
          </button>
        </div>
      </Layout>
    );
  }

  const dutyHours = shift.status === 'IN_PROGRESS' 
    ? calculateDutyHours(shift.signOnTime)
    : { hours: 0, minutes: 0, totalHours: shift.dutyHours || 0 };

  const statusBadge = getStatusBadge(shift.status);

  return (
    <Layout>
      <ErrorBoundary>
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => navigate('/dashboard/active-shifts')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FaArrowLeft className="text-xl text-[#003d82]" />
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <FaTrain className="text-3xl text-[#003d82]" />
                  <h1 className="text-3xl font-bold text-[#003d82]">
                    Train #{shift.trainNumber}
                  </h1>
                  <span className={`px-4 py-1 rounded-full text-sm font-semibold border-2 ${statusBadge.color}`}>
                    {statusBadge.text}
                  </span>
                </div>
                <p className="text-lg text-gray-600">{shift.trainName}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Current Duty Hours</p>
                <p className="text-5xl font-bold text-[#003d82]">
                  {shift.status === 'IN_PROGRESS' 
                    ? `${dutyHours.hours}h ${dutyHours.minutes}m`
                    : `${Math.floor(dutyHours.totalHours)}h ${Math.round((dutyHours.totalHours % 1) * 60)}m`
                  }
                </p>
                {shift.status === 'IN_PROGRESS' && (
                  <p className="text-xs text-gray-500 mt-1">Live Tracking</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {canEdit() && shift.status === 'IN_PROGRESS' && (
                <>
                  <button
                    onClick={handleEdit}
                    className="px-6 py-2 bg-[#003d82] text-white rounded-md hover:bg-[#002b5c] transition-colors flex items-center gap-2"
                  >
                    <FaEdit /> Edit Shift
                  </button>
                  <button
                    onClick={handleComplete}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <FaCheckCircle /> Complete Shift
                  </button>
                </>
              )}
              <button
                onClick={() => navigate(`/dashboard/shifts/${id}/alerts`)}
                className="px-6 py-2 border-2 border-[#003d82] text-[#003d82] rounded-md hover:bg-[#003d82] hover:text-white transition-colors flex items-center gap-2"
              >
                <FaExclamationTriangle /> View Alerts ({shift.alerts?.length || 0})
              </button>
            </div>
          </div>

          {/* Shift Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-[#003d82] mb-4 flex items-center gap-2">
                <FaTrain /> Shift Information
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Locomotive Number:</span>
                  <span className="font-semibold">{shift.locomotive?.locomotiveNo || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Section:</span>
                  <span className="font-semibold">{shift.section}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duty Type:</span>
                  <span className="font-semibold">{shift.dutyType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sign-on Station:</span>
                  <span className="font-semibold">{shift.signOnStation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sign-on Time:</span>
                  <span className="font-semibold">{dayjs(shift.signOnTime).format('DD MMM YYYY, HH:mm')}</span>
                </div>
                {shift.signOffStation && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sign-off Station:</span>
                      <span className="font-semibold">{shift.signOffStation}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sign-off Time:</span>
                      <span className="font-semibold">{dayjs(shift.signOffTime).format('DD MMM YYYY, HH:mm')}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Crew Information */}
            <div className="space-y-4">
              {/* Loco Pilot Card */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-[#003d82] mb-4 flex items-center gap-2">
                  <FaUser /> Loco Pilot
                </h3>
                <div className="space-y-2">
                  <p className="text-xl font-semibold text-gray-800">{shift.locoPilot?.name || 'N/A'}</p>
                  <p className="text-sm text-gray-600">ID: {shift.locoPilot?.employeeId || 'N/A'}</p>
                  {shift.locoPilot?.phone && (
                    <button
                      onClick={() => handleCallPhone(shift.locoPilot.phone)}
                      className="flex items-center gap-2 text-[#003d82] hover:text-[#002b5c] font-medium"
                    >
                      <FaPhone /> {shift.locoPilot.phone}
                    </button>
                  )}
                </div>
              </div>

              {/* Train Manager Card */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-[#003d82] mb-4 flex items-center gap-2">
                  <FaUser /> Train Manager
                </h3>
                <div className="space-y-2">
                  <p className="text-xl font-semibold text-gray-800">{shift.trainManager?.name || 'N/A'}</p>
                  <p className="text-sm text-gray-600">ID: {shift.trainManager?.employeeId || 'N/A'}</p>
                  {shift.trainManager?.phone && (
                    <button
                      onClick={() => handleCallPhone(shift.trainManager.phone)}
                      className="flex items-center gap-2 text-[#003d82] hover:text-[#002b5c] font-medium"
                    >
                      <FaPhone /> {shift.trainManager.phone}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs: Timeline, Alerts, Logs */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="flex border-b border-gray-200">
              {[
                { key: 'timeline', label: 'Timeline', icon: FaClock },
                { key: 'alerts', label: 'Alert History', icon: FaExclamationTriangle },
                { key: 'logs', label: 'Duty Logs', icon: FaHistory },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === tab.key
                      ? 'border-b-2 border-[#003d82] text-[#003d82] bg-blue-50'
                      : 'text-gray-600 hover:text-[#003d82] hover:bg-gray-50'
                  }`}
                >
                  <tab.icon />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div className="p-6">
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                  <div className="space-y-6">
                    {/* Sign On */}
                    <div className="relative pl-12">
                      <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                        <FaCalendarAlt className="text-white text-sm" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">Sign On</p>
                        <p className="text-sm text-gray-600">{dayjs(shift.signOnTime).format('DD MMM YYYY, HH:mm:ss')}</p>
                        <p className="text-xs text-gray-500 mt-1">Station: {shift.signOnStation}</p>
                      </div>
                    </div>

                    {/* Train Arrival */}
                    {shift.trainArrivalTime && (
                      <div className="relative pl-12">
                        <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                          <FaMapMarkerAlt className="text-white text-sm" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">Train Arrival</p>
                          <p className="text-sm text-gray-600">{dayjs(shift.trainArrivalTime).format('DD MMM YYYY, HH:mm:ss')}</p>
                        </div>
                      </div>
                    )}

                    {/* Take Over */}
                    {shift.takeOverTime && (
                      <div className="relative pl-12">
                        <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                          <FaTrain className="text-white text-sm" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">Take Over</p>
                          <p className="text-sm text-gray-600">{dayjs(shift.takeOverTime).format('DD MMM YYYY, HH:mm:ss')}</p>
                        </div>
                      </div>
                    )}

                    {/* Departure */}
                    {shift.departureTime && (
                      <div className="relative pl-12">
                        <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
                          <FaRoute className="text-white text-sm" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">Departure</p>
                          <p className="text-sm text-gray-600">{dayjs(shift.departureTime).format('DD MMM YYYY, HH:mm:ss')}</p>
                        </div>
                      </div>
                    )}

                    {/* Relief Planned */}
                    {shift.reliefPlanned && (
                      <div className="relative pl-12">
                        <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center">
                          <FaExclamationTriangle className="text-white text-sm" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">Relief Planned</p>
                          <p className="text-sm text-gray-600">{dayjs(shift.reliefTime).format('DD MMM YYYY, HH:mm:ss')}</p>
                          <p className="text-xs text-gray-500 mt-1">Duty Hours: {shift.dutyHoursAtRelief}h</p>
                        </div>
                      </div>
                    )}

                    {/* Sign Off */}
                    {shift.signOffTime && (
                      <div className="relative pl-12">
                        <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                          <FaCheckCircle className="text-white text-sm" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">Sign Off</p>
                          <p className="text-sm text-gray-600">{dayjs(shift.signOffTime).format('DD MMM YYYY, HH:mm:ss')}</p>
                          <p className="text-xs text-gray-500 mt-1">Station: {shift.signOffStation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Alert History Tab */}
            {activeTab === 'alerts' && (
              <div className="p-6">
                {/* Alert Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-xs text-blue-600 font-semibold mb-1">Total Alerts</p>
                    <p className="text-3xl font-bold text-blue-700">{displayAlerts?.length || 0}</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-xs text-yellow-600 font-semibold mb-1">Caution (8-9hrs)</p>
                    <p className="text-3xl font-bold text-yellow-700">{displayAlerts?.filter(a => a.threshold === 8).length || 0}</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-xs text-orange-600 font-semibold mb-1">Warning (11-12hrs)</p>
                    <p className="text-3xl font-bold text-orange-700">{displayAlerts?.filter(a => a.threshold === 11 || a.threshold === 12).length || 0}</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-xs text-red-600 font-semibold mb-1">Critical (14hrs+)</p>
                    <p className="text-3xl font-bold text-red-700">{displayAlerts?.filter(a => a.threshold >= 14).length || 0}</p>
                  </div>
                </div>

                {(!displayAlerts || displayAlerts.length === 0) ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <FaCheckCircle className="text-4xl text-green-400 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm">No alerts triggered for this shift</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayAlerts.map((alert, index) => (
                      <div
                        key={index}
                        className={`border-l-4 p-3 rounded flex items-center justify-between ${getAlertSeverityColor(alert.severity)}`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <FaExclamationTriangle className="text-orange-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 text-sm">{alert.threshold}HR Alert</p>
                            <p className="text-xs text-gray-600">{alert.dutyHoursAtAlert}h duty hours</p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 shrink-0 ml-2">
                          {dayjs(alert.timestamp).format('HH:mm')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Duty Logs Tab */}
            {activeTab === 'logs' && (
              <div className="p-6">
                {/* Log Type Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {['SIGN_ON', 'DEPARTURE', 'ARRIVAL', 'SIGN_OFF'].map((type) => {
                    const count = displayLogs?.filter(log => log.logType === type).length || 0;
                    return (
                      <div key={type} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <p className="text-xs text-gray-600 font-semibold mb-1">{type.replace('_', ' ')}</p>
                        <p className="text-2xl font-bold text-[#003d82]">{count}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Log Filter */}
                <div className="mb-4">
                  <select
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#003d82]"
                  >
                    <option value="ALL">All Logs</option>
                    <option value="SIGN_ON">Sign On</option>
                    <option value="TAKE_OVER">Take Over</option>
                    <option value="DEPARTURE">Departure</option>
                    <option value="ARRIVAL">Arrival</option>
                    <option value="RELIEF">Relief</option>
                    <option value="SIGN_OFF">Sign Off</option>
                    <option value="ALERT">Alerts</option>
                    <option value="NOTE">Notes</option>
                  </select>
                </div>

                {(!displayLogs || displayLogs.length === 0) ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <FaFileAlt className="text-4xl text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm">No logs available</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayLogs
                      .filter(log => logFilter === 'ALL' || log.logType === logFilter)
                      .map((log, index) => {
                        const LogIcon = getLogTypeIcon(log.logType);
                        return (
                          <div key={index} className="border-l-4 border-blue-500 bg-gray-50 p-3 rounded flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <LogIcon className="text-[#003d82] shrink-0" />
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-800 text-sm">{log.logType.replace('_', ' ')}</p>
                                {log.dutyHoursAtLog !== undefined && (
                                  <p className="text-xs text-gray-600">{log.dutyHoursAtLog}h duty hours</p>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-gray-500 shrink-0 ml-2">
                              {dayjs(log.timestamp).format('HH:mm')}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Remarks Section */}
          {shift.remarks && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-[#003d82] mb-4 flex items-center gap-2">
                <FaFileAlt /> Remarks
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">{shift.remarks}</p>
            </div>
          )}
        </div>

        {/* Complete Shift Modal */}
        {showCompleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="bg-[#003d82] text-white px-6 py-4 rounded-t-lg">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <FaCheckCircle /> Complete Shift
                </h3>
                <p className="text-sm opacity-90 mt-1">
                  Enter sign-off details for Train #{shift.trainNumber}
                </p>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleCompleteSubmit} className="p-6 space-y-4">
                {/* Sign-Off Date & Time */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Sign-Off Date & Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={completeFormData.signOffDateTime}
                    onChange={(e) =>
                      setCompleteFormData({ ...completeFormData, signOffDateTime: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#003d82] focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Select the date and time when the crew signed off
                  </p>
                </div>

                {/* Sign-Off Station */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Sign-Off Station <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={completeFormData.signOffStation}
                    onChange={(e) =>
                      setCompleteFormData({ ...completeFormData, signOffStation: e.target.value })
                    }
                    placeholder="Enter station name"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#003d82] focus:border-transparent"
                  />
                </div>

                {/* Duty Hours Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Duty Hours Summary</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Sign On:</span>
                    <span className="font-semibold text-gray-800">
                      {dayjs(shift.signOnTime).format('DD MMM, HH:mm')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-gray-600">Total Duty Hours:</span>
                    <span className="font-bold text-[#003d82] text-lg">
                      {dutyHours.hours}h {dutyHours.minutes}m
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCompleteModalClose}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Completing...</span>
                      </>
                    ) : (
                      <>
                        <FaCheckCircle /> Complete Shift
                      </>
                    )}
                  </button>
                </div>

                {/* Warning Note */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-xs text-yellow-800">
                    <strong>Note:</strong> This action will mark the shift as completed and cannot be undone. 
                    Ensure all details are correct before proceeding.
                  </p>
                </div>
              </form>
            </div>
          </div>
        )}
      </ErrorBoundary>
    </Layout>
  );
};

export default ShiftDetailsPage;
