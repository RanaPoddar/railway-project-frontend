import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import EmptyState from '../../components/EmptyState';
import ErrorBoundary from '../../components/ErrorBoundary';
import { FaTrain, FaClock, FaUser, FaExclamationTriangle, FaPhone } from 'react-icons/fa';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import useAuthStore from '../../stores/useAuthStore';
import useToastStore from '../../stores/useToastStore';
import shiftService from '../../services/shiftService';

dayjs.extend(duration);
dayjs.extend(relativeTime);

const ActiveShiftsPage = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(dayjs());
  const [isLoading, setIsLoading] = useState(true);
  const [shifts, setShifts] = useState([]);
  const [activeShifts, setActiveShifts] = useState([]);
  
  const canEdit = useAuthStore((state) => state.canEdit);
  const { warning } = useToastStore();

  // Utility function to calculate duty hours
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

  // Fetch shifts from API
  useEffect(() => {
    const fetchShifts = async () => {
      try {
        setIsLoading(true);
        const response = await shiftService.getAllShifts({ status: 'IN_PROGRESS' });
        
        if (response.success && response.data) {
          // Transform API data to match frontend format
          const transformedShifts = response.data.map(shift => {
            console.log('Raw shift data:', {
              id: shift.id,
              trainNumber: shift.trainNumber,
              signOnDateTime: shift.signOnDateTime,
              departureDateTime: shift.departureDateTime,
              trainArrivalDateTime: shift.trainArrivalDateTime,
            });

            return {
              id: shift.id,
              trainNumber: shift.trainNumber,
              trainName: shift.trainName,
              locomotiveNumber: shift.locomotiveNo || 'N/A',
              dutyType: shift.dutyType,
              signOnStation: shift.signOnStation,
              section: shift.section,
              signOnTime: shift.signOnDateTime, // Backend uses signOnDateTime
              departureTime: shift.departureDateTime, // Backend uses departureDateTime
              trainArrivalTime: shift.trainArrivalDateTime,
              status: shift.status,
              locoPilot: {
                name: shift.locoPilot?.name || 'N/A',
                id: shift.locoPilot?.employeeId || 'N/A',
                phone: shift.locoPilot?.phone || 'N/A',
              },
              trainManager: {
                name: shift.trainManager?.name || 'N/A',
                id: shift.trainManager?.employeeId || 'N/A',
                phone: shift.trainManager?.phone || 'N/A',
              },
              reliefPlanned: shift.reliefPlanned,
              reliefTime: shift.reliefTime,
              dutyHours: shift.dutyHours,
              notifications: [],
            };
          });
          
          setShifts(transformedShifts);
          setActiveShifts(transformedShifts);
        }
      } catch (error) {
        console.error('Failed to fetch shifts:', error);
        warning('Failed to load shifts. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchShifts();
  }, [setActiveShifts, warning]);

  // Update current time every second for live tracking
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  const getAlertLevelDisplay = (totalHours) => {
    if (totalHours >= 14) return { level: 'critical', color: 'red', text: 'CRITICAL - 14+ Hours' };
    if (totalHours >= 12) return { level: 'danger', color: 'red', text: 'DANGER - 12+ Hours' };
    if (totalHours >= 11) return { level: 'warning', color: 'orange', text: 'WARNING - 11+ Hours' };
    if (totalHours >= 9) return { level: 'alert', color: 'yellow', text: 'ALERT - 9+ Hours' };
    if (totalHours >= 8) return { level: 'caution', color: 'blue', text: 'CAUTION - 8+ Hours' };
    return { level: 'normal', color: 'green', text: 'Normal' };
  };



  return (
    <Layout>
      <ErrorBoundary>
        <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-[#003d82] flex items-center gap-3">
              <FaClock />
              Active Shifts Monitoring
            </h2>
            <p className="text-gray-600 mt-2">
              Real-time tracking of duty hours for all active shifts
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Current Time</p>
            <p className="text-2xl font-bold text-[#003d82]">
              {currentTime.format('HH:mm:ss')}
            </p>
            <p className="text-xs text-gray-500">{currentTime.format('DD MMM YYYY')}</p>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Total Active</p>
            <p className="text-3xl font-bold text-gray-800">{activeShifts.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600">Alerts (8+ hrs)</p>
            <p className="text-3xl font-bold text-gray-800">
              {activeShifts.filter(s => calculateDutyHours(s.signOnTime).totalHours >= 8).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-red-500">
            <p className="text-sm text-gray-600">Critical (12+ hrs)</p>
            <p className="text-3xl font-bold text-gray-800">
              {activeShifts.filter(s => calculateDutyHours(s.signOnTime).totalHours >= 12).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">Relief Planned</p>
            <p className="text-3xl font-bold text-gray-800">
              {activeShifts.filter(s => s.reliefPlanned).length}
            </p>
          </div>
        </div>

        {/* Active Shifts List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003d82] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading shifts...</p>
            </div>
          ) : activeShifts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <EmptyState
                icon={FaTrain}
                title="No Active Shifts"
                message="There are currently no active shifts being tracked. Create a new shift to start monitoring duty hours for loco pilots and train managers."
                action={canEdit() ? () => navigate('/dashboard/create-shift') : null}
                actionLabel="Create New Shift"
              />
            </div>
          ) : (
            activeShifts.map((shift) => {
              const dutyHours = calculateDutyHours(shift.signOnTime);
              const alert = getAlertLevelDisplay(dutyHours.totalHours);
              
              return (
                <div
                  key={shift.id}
                  className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                    alert.level === 'critical' || alert.level === 'danger' ? 'border-red-600' :
                    alert.level === 'warning' ? 'border-orange-500' :
                    alert.level === 'alert' ? 'border-yellow-500' :
                    alert.level === 'caution' ? 'border-blue-500' :
                    'border-green-500'
                  }`}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Train Info */}
                    <div className="lg:col-span-3">
                      <div className="flex items-start gap-3">
                        <FaTrain className="text-2xl text-[#003d82] mt-1" />
                        <div>
                          <h3 
                            className="text-lg font-bold text-[#003d82] hover:text-[#002b5c] cursor-pointer underline"
                            onClick={() => navigate(`/dashboard/shifts/${shift.id}`)}
                          >
                            Train #{shift.trainNumber}
                          </h3>
                          <p className="text-sm text-gray-600">{shift.locomotiveNumber}</p>
                          <p className="text-xs text-gray-500 mt-1">{shift.dutyType}</p>
                          <p className="text-xs text-gray-500">{shift.section}</p>
                        </div>
                      </div>
                    </div>

                    {/* Duty Hours - Prominent */}
                    <div className="lg:col-span-2 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">Duty Hours</p>
                        <div className={`text-4xl font-bold ${
                          alert.level === 'critical' || alert.level === 'danger' ? 'text-red-600' :
                          alert.level === 'warning' ? 'text-orange-500' :
                          alert.level === 'alert' ? 'text-yellow-600' :
                          alert.level === 'caution' ? 'text-blue-600' :
                          'text-green-600'
                        }`}>
                          {dutyHours.hours}h {dutyHours.minutes}m
                        </div>
                        <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                          alert.level === 'critical' || alert.level === 'danger' ? 'bg-red-100 text-red-700' :
                          alert.level === 'warning' ? 'bg-orange-100 text-orange-700' :
                          alert.level === 'alert' ? 'bg-yellow-100 text-yellow-700' :
                          alert.level === 'caution' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {(alert.level === 'critical' || alert.level === 'danger' || alert.level === 'warning') && (
                            <FaExclamationTriangle />
                          )}
                          {alert.text}
                        </div>
                      </div>
                    </div>

                    {/* Personnel Info */}
                    <div className="lg:col-span-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <FaUser className="text-gray-400 mt-1" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-500">Loco Pilot</p>
                            <p className="font-semibold text-gray-800">{shift.locoPilot.name}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                              <span>ID: {shift.locoPilot.id}</span>
                              <span className="flex items-center gap-1">
                                <FaPhone className="text-xs" /> {shift.locoPilot.phone}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <FaUser className="text-gray-400 mt-1" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-500">Train Manager</p>
                            <p className="font-semibold text-gray-800">{shift.trainManager.name}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                              <span>ID: {shift.trainManager.id}</span>
                              <span className="flex items-center gap-1">
                                <FaPhone className="text-xs" /> {shift.trainManager.phone}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Shift Timing Info */}
                    <div className="lg:col-span-3 flex flex-col gap-2 justify-center">
                      <div className="text-xs text-gray-600 mb-1">
                        <p>Sign On: {dayjs(shift.signOnTime).format('HH:mm')}</p>
                        <p>Departure: {dayjs(shift.departureTime).format('HH:mm')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        </div>
      </ErrorBoundary>

    </Layout>
  );
};

export default ActiveShiftsPage;
