import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  Modal,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Employee, RoomWithOccupancy } from '../constants/campData';
import {
  initDatabase,
  fetchRoomsWithOccupancy,
  fetchAllEmployees,
  addEmployee,
  updateEmployeeRoom,
  checkoutEmployeeEX,
  resetDatabase,
} from '../services/database';
import { exportEmployeesToExcel } from '../services/excelService';

export default function AppScreen() {
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'search' | 'settings'>('dashboard');

  // Filters
  const [selectedShift, setSelectedShift] = useState<string>('A');
  const [selectedBlock, setSelectedBlock] = useState<number | 'ALL'>('ALL');

  // Data States
  const [rooms, setRooms] = useState<RoomWithOccupancy[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  // Search
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Bottom Sheets
  const [selectedRoom, setSelectedRoom] = useState<RoomWithOccupancy | null>(null);
  const [roomOccupants, setRoomOccupants] = useState<Employee[]>([]);
  const [isRoomDetailVisible, setIsRoomDetailVisible] = useState<boolean>(false);

  // Add/Assign Employee Modal
  const [isAddModalVisible, setIsAddModalVisible] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    emp_code: '',
    surname: '',
    name: '',
    job_position: '',
    shift: 'A',
    room_no: '',
  });

  // Move Room Modal
  const [movingEmployee, setMovingEmployee] = useState<Employee | null>(null);
  const [targetRoomNo, setTargetRoomNo] = useState<string>('');
  const [isMoveModalVisible, setIsMoveModalVisible] = useState<boolean>(false);

  // Employee Action Modal (From Search)
  const [selectedEmployeeForAction, setSelectedEmployeeForAction] = useState<Employee | null>(null);
  const [isEmpActionModalVisible, setIsEmpActionModalVisible] = useState<boolean>(false);

  // Load Data
  const loadData = useCallback(() => {
    try {
      const emps = fetchAllEmployees();
      setAllEmployees(emps);

      const rms = fetchRoomsWithOccupancy(selectedShift);
      setRooms(rms);

      if (selectedRoom) {
        const updatedOccupants = emps.filter(
          (e) => e.room_no === selectedRoom.room_no && e.shift === selectedShift
        );
        setRoomOccupants(updatedOccupants);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, [selectedShift, selectedRoom]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await initDatabase();
        loadData();
      } catch (err) {
        Alert.alert('Алдаа', 'Өгөгдлийн бааз эхлүүлэхэд алдаа гарлаа');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadData]);

  // Color Calculation
  const getStatusColor = (occupancy: number, capacity: number) => {
    if (occupancy === 0) return { bg: '#F3F4F6', text: '#6B7280', label: 'Хоосон' };
    if (occupancy < capacity) return { bg: '#DCFCE7', text: '#15803D', label: 'Сул ортой' };
    if (occupancy === capacity) return { bg: '#FEE2E2', text: '#B91C1C', label: 'Дүүрсэн' };
    return { bg: '#F3E8FF', text: '#6B21A8', label: 'Хэтэрсэн (+)' };
  };

  const filteredRooms = useMemo(() => {
    if (selectedBlock === 'ALL') return rooms;
    return rooms.filter((r) => r.block_no === selectedBlock);
  }, [rooms, selectedBlock]);

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return allEmployees;
    const q = searchQuery.toLowerCase().trim();
    return allEmployees.filter(
      (e) =>
        (e.name || '').toLowerCase().includes(q) ||
        (e.surname || '').toLowerCase().includes(q) ||
        (e.emp_code || '').toLowerCase().includes(q) ||
        (e.room_no || '').toLowerCase().includes(q) ||
        (e.job_position || '').toLowerCase().includes(q)
    );
  }, [allEmployees, searchQuery]);

  const handleOpenRoom = (room: RoomWithOccupancy) => {
    setSelectedRoom(room);
    const occupants = allEmployees.filter((e) => e.room_no === room.room_no && e.shift === selectedShift);
    setRoomOccupants(occupants);
    setIsRoomDetailVisible(true);
  };

  const handleOpenEmployeeAction = (emp: Employee) => {
    setSelectedEmployeeForAction(emp);
    setIsEmpActionModalVisible(true);
  };

  const handleCheckout = (emp: Employee) => {
    Alert.alert(
      'Кемпээс буулгах (EX)',
      `${emp.surname || ''} ${emp.name || ''}-ийг [${emp.room_no}] өрөөнөөс гаргаж "EX" статус өгөх үү?`,
      [
        { text: 'Цуцлах', style: 'cancel' },
        {
          text: 'Тийм, Гаргах',
          style: 'destructive',
          onPress: () => {
            checkoutEmployeeEX(emp.id);
            Alert.alert('Амжилттай', 'Ажилтан "EX" боллоо');
            loadData();
          },
        },
      ]
    );
  };

  const handleOpenMoveModal = (emp: Employee) => {
    setMovingEmployee(emp);
    setTargetRoomNo('');
    setIsMoveModalVisible(true);
  };

  const executeMoveRoom = () => {
    if (!movingEmployee || !targetRoomNo.trim()) {
      Alert.alert('Анхааруулга', 'Өрөөний дугаарыг оруулна уу');
      return;
    }

    const roomTarget = targetRoomNo.trim();
    const destRoom = rooms.find((r) => r.room_no === roomTarget);
    
    if (!destRoom) {
      Alert.alert('Алдаа', `[${roomTarget}] өрөө Блок 1, 7, 8, 9-д бүртгэлгүй байна.`);
      return;
    }

    const currentOcc = allEmployees.filter((e) => e.room_no === roomTarget && e.shift === movingEmployee.shift).length;
    
    if (currentOcc >= destRoom.room_size) {
      Alert.alert(
        'Багтаамж дүүрсэн',
        `[${roomTarget}] өрөөний багтаамж дүүрсэн (${currentOcc}/${destRoom.room_size}). Нэмэлт ор тавьж оруулах уу?`,
        [
          { text: 'Үгүй', style: 'cancel' },
          {
            text: 'Зөвшөөрөх & Зөөх',
            onPress: () => {
              updateEmployeeRoom(movingEmployee.id, roomTarget);
              Alert.alert('Амжилттай', `Ажилтныг [${roomTarget}] өрөө рүү шилжүүллээ.`);
              setIsMoveModalVisible(false);
              setIsRoomDetailVisible(false);
              loadData();
            },
          },
        ]
      );
    } else {
      updateEmployeeRoom(movingEmployee.id, roomTarget);
      Alert.alert('Амжилттай', `Ажилтныг [${roomTarget}] өрөө рүү шилжүүллээ.`);
      setIsMoveModalVisible(false);
      setIsRoomDetailVisible(false);
      loadData();
    }
  };

  const handleSaveNewEmployee = () => {
    const { emp_code, surname, name, job_position, shift, room_no } = formData;

    if (!surname.trim() || !name.trim() || !job_position.trim() || !room_no.trim()) {
      Alert.alert('Алдаа', 'Шаардлагатай талбаруудыг бүрэн засна уу');
      return;
    }

    const roomExists = rooms.find((r) => r.room_no === room_no.trim());
    if (!roomExists) {
      Alert.alert('Анхааруулга', `[${room_no}] дугаартай өрөө олдсонгүй (Зөвхөн 1, 7, 8, 9 блокийн өрөө)`);
      return;
    }

    if (emp_code.trim()) {
      const existingEmp = allEmployees.find((e) => e.emp_code === emp_code.trim() && e.room_no !== 'EX');
      if (existingEmp) {
        Alert.alert(
          'Давхардал илэрлээ',
          `Ажилтан ${existingEmp.surname || ''} ${existingEmp.name || ''} [${existingEmp.room_no}] өрөөнд бүртгэлтэй байна. [${room_no}] рүү шилжүүлэх үү?`,
          [
            { text: 'Цуцлах', style: 'cancel' },
            {
              text: 'Шилжүүлэх',
              onPress: () => {
                updateEmployeeRoom(existingEmp.id, room_no.trim(), shift);
                Alert.alert('Амжилттай', 'Өрөөг шилжүүлэн заслаа');
                setIsAddModalVisible(false);
                resetForm();
                loadData();
              },
            },
          ]
        );
        return;
      }
    }

    const roomOccupancy = allEmployees.filter((e) => e.room_no === room_no.trim() && e.shift === shift).length;
    
    if (roomOccupancy >= roomExists.room_size) {
      Alert.alert(
        'Өрөөний багтаамж хэтэрсэн',
        `[${room_no}] өрөө дүүрсэн байна (${roomOccupancy}/${roomExists.room_size}). Нэмэлт ор тавьж бүртгэх үү?`,
        [
          { text: 'Цуцлах', style: 'cancel' },
          {
            text: 'Тийм, Нэмэх',
            onPress: () => insertEmployeeToDb(),
          },
        ]
      );
    } else {
      insertEmployeeToDb();
    }
  };

  const insertEmployeeToDb = () => {
    const { emp_code, surname, name, job_position, shift, room_no } = formData;
    addEmployee({
      emp_code: emp_code.trim(),
      surname: surname.trim(),
      name: name.trim(),
      job_position: job_position.trim(),
      shift,
      room_no: room_no.trim(),
    });
    Alert.alert('Амжилттай', 'Шинэ ажилтан бүртгэгдлээ');
    setIsAddModalVisible(false);
    resetForm();
    loadData();
  };

  const resetForm = () => {
    setFormData({
      emp_code: '',
      surname: '',
      name: '',
      job_position: '',
      shift: selectedShift,
      room_no: '',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Өгөгдлийн бааз бэлдэж байна...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* HEADER BAR */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Кемпийн Бүртгэл</Text>
          <Text style={styles.headerSubtitle}>Samsung S25 One-Hand UX</Text>
        </View>
        <TouchableOpacity style={styles.exportBtn} onPress={exportEmployeesToExcel}>
          <MaterialCommunityIcons name="file-excel" size={20} color="#15803D" />
          <Text style={styles.exportBtnText}>Excel</Text>
        </TouchableOpacity>
      </View>

      {/* MAIN VIEW */}
      {activeTab === 'dashboard' && (
        <View style={styles.mainContent}>
          <View style={styles.shiftSelectorContainer}>
            <Text style={styles.sectionLabel}>Ээлж сонгох:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shiftScroll}>
              {['A', 'B', 'C', 'D', 'Z'].map((sh) => (
                <TouchableOpacity
                  key={sh}
                  style={[styles.shiftChip, selectedShift === sh && styles.shiftChipActive]}
                  onPress={() => setSelectedShift(sh)}
                >
                  <Text style={[styles.shiftChipText, selectedShift === sh && styles.shiftChipTextActive]}>
                    Ээлж {sh}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.blockFilterContainer}>
            {(['ALL', 1, 7, 8, 9] as const).map((blk) => (
              <TouchableOpacity
                key={blk.toString()}
                style={[styles.blockBtn, selectedBlock === blk && styles.blockBtnActive]}
                onPress={() => setSelectedBlock(blk)}
              >
                <Text style={[styles.blockBtnText, selectedBlock === blk && styles.blockBtnTextActive]}>
                  {blk === 'ALL' ? 'Бүгд' : `Блок ${blk}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <FlatList
            data={filteredRooms}
            keyExtractor={(item) => item.room_no}
            numColumns={2}
            contentContainerStyle={styles.gridContainer}
            renderItem={({ item }) => {
              const status = getStatusColor(item.occupancy, item.room_size);
              return (
                <TouchableOpacity style={styles.roomCard} onPress={() => handleOpenRoom(item)} activeOpacity={0.7}>
                  <View style={styles.roomCardHeader}>
                    <Text style={styles.roomNumber}>№ {item.room_no}</Text>
                    <View style={[styles.badge, { backgroundColor: status.bg }]}>
                      <Text style={[styles.badgeText, { color: status.text }]}>{status.label}</Text>
                    </View>
                  </View>

                  <Text style={styles.roomType}>{item.room_type}</Text>

                  <View style={styles.roomCardFooter}>
                    <Ionicons name="bed-outline" size={18} color="#64748B" />
                    <Text style={styles.occupancyText}>
                      <Text style={{ fontWeight: '700', color: status.text }}>{item.occupancy}</Text> / {item.room_size} ор
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* SEARCH VIEW */}
      {activeTab === 'search' && (
        <View style={styles.mainContent}>
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={20} color="#64748B" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Нэр, Овог, ID эсвэл Өрөөний дугаараар хайх..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filteredEmployees}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.empCard}
                onPress={() => handleOpenEmployeeAction(item)}
                activeOpacity={0.7}
              >
                <View style={styles.empAvatar}>
                  <Text style={styles.empAvatarText}>{(item.name || '?').charAt(0)}</Text>
                </View>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Text style={styles.empName}>
                    {item.surname || ''} {item.name || ''} <Text style={styles.empCode}>({item.emp_code || 'ID-гүй'})</Text>
                  </Text>
                  <Text style={styles.empJob}>{item.job_position || ''}</Text>
                  <Text style={styles.empShift}>Ээлж {item.shift} • Өрөө: <Text style={{ fontWeight: '700', color: '#0284C7' }}>{item.room_no}</Text></Text>
                </View>
                
                <View style={{ alignItems: 'flex-end' }}>
                  {item.room_no === 'EX' ? (
                    <View style={[styles.roomBadge, { backgroundColor: '#FEE2E2' }]}>
                      <Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 11 }}>EX</Text>
                    </View>
                  ) : (
                    <View style={[styles.roomBadge, { backgroundColor: '#E0F2FE' }]}>
                      <Text style={{ color: '#0369A1', fontWeight: '700', fontSize: 11 }}>Өрөө {item.room_no}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* SETTINGS VIEW */}
      {activeTab === 'settings' && (
        <View style={[styles.mainContent, { padding: 20 }]}>
          <Text style={styles.settingsTitle}>Системийн Тохиргоо</Text>
          
          <TouchableOpacity style={styles.settingsOption} onPress={exportEmployeesToExcel}>
            <MaterialCommunityIcons name="file-excel" size={24} color="#15803D" />
            <Text style={styles.settingsOptionText}>Тайлан Excel файл болгон татах</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsOption}
            onPress={() => {
              Alert.alert('Мэдээлэл', 'Дата амжилттай синхрончлогдлоо.');
              loadData();
            }}
          >
            <Ionicons name="refresh" size={24} color="#2563EB" />
            <Text style={styles.settingsOptionText}>Дата Шинэчлэх / Sync</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingsOption, { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }]}
            onPress={() => {
              Alert.alert(
                'Бүх датаг устгах',
                'Та бүх өгөгдлийг устгаад анхны Excel файлаас анхны утгыг нь дахин татаж шинэчлэхдээ итгэлтэй байна уу?',
                [
                  { text: 'Цуцлах', style: 'cancel' },
                  {
                    text: 'Тийм, Шинэчлэх',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        setLoading(true);
                        await resetDatabase();
                        loadData();
                        Alert.alert('Амжилттай', 'Бүх дата устгагдаж, Excel файлаас анхны утгууд амжилттай дахин татагдлаа.');
                      } catch (error) {
                        Alert.alert('Алдаа', 'Датаг шинэчлэх явцад алдаа гарлаа.');
                      } finally {
                        setLoading(false);
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Ionicons name="trash-bin" size={24} color="#DC2626" />
            <Text style={[styles.settingsOptionText, { color: '#DC2626' }]}>Бүх датаг устгаж, анхны утгаар шинэчлэх</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* FAB BUTTON */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          resetForm();
          setIsAddModalVisible(true);
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      {/* BOTTOM NAV BAR */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('dashboard')}>
          <Ionicons
            name={activeTab === 'dashboard' ? 'home' : 'home-outline'}
            size={24}
            color={activeTab === 'dashboard' ? '#2563EB' : '#64748B'}
          />
          <Text style={[styles.navLabel, activeTab === 'dashboard' && styles.navLabelActive]}>Нүүр</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('search')}>
          <Ionicons
            name={activeTab === 'search' ? 'search' : 'search-outline'}
            size={24}
            color={activeTab === 'search' ? '#2563EB' : '#64748B'}
          />
          <Text style={[styles.navLabel, activeTab === 'search' && styles.navLabelActive]}>Хайлт</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('settings')}>
          <Ionicons
            name={activeTab === 'settings' ? 'settings' : 'settings-outline'}
            size={24}
            color={activeTab === 'settings' ? '#2563EB' : '#64748B'}
          />
          <Text style={[styles.navLabel, activeTab === 'settings' && styles.navLabelActive]}>Тохиргоо</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL: ROOM DETAILS */}
      <Modal visible={isRoomDetailVisible} animationType="slide" transparent onRequestClose={() => setIsRoomDetailVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheetContainer}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Өрөө № {selectedRoom?.room_no}</Text>
                <Text style={styles.modalSubTitle}>
                  Блок {selectedRoom?.block_no} • {selectedRoom?.room_type} • Ээлж {selectedShift}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsRoomDetailVisible(false)}>
                <Ionicons name="close-circle-outline" size={28} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 14, color: '#475569', marginBottom: 10, fontWeight: '600' }}>
              Байрлаж буй ажилтнууд ({roomOccupants.length}/{selectedRoom?.room_size}):
            </Text>

            {roomOccupants.length === 0 ? (
              <View style={styles.emptyOccupants}>
                <Ionicons name="bed-outline" size={40} color="#94A3B8" />
                <Text style={{ color: '#94A3B8', marginTop: 8 }}>Энэ ээлжинд ажилтан байрлаагүй байна</Text>
              </View>
            ) : (
              <FlatList
                data={roomOccupants}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={styles.occupantItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.occupantName}>{item.surname || ''} {item.name || ''}</Text>
                      <Text style={styles.occupantJob}>{item.job_position || ''} | ID: {item.emp_code || '-'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        style={[styles.smallBtn, { backgroundColor: '#E0F2FE' }]}
                        onPress={() => handleOpenMoveModal(item)}
                      >
                        <Text style={{ color: '#0284C7', fontWeight: '600', fontSize: 12 }}>Зөөх</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.smallBtn, { backgroundColor: '#FEE2E2' }]}
                        onPress={() => handleCheckout(item)}
                      >
                        <Text style={{ color: '#DC2626', fontWeight: '600', fontSize: 12 }}>EX (Гаргах)</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL: EMPLOYEE ACTION FROM SEARCH */}
      <Modal visible={isEmpActionModalVisible} animationType="fade" transparent onRequestClose={() => setIsEmpActionModalVisible(false)}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.dialogCard}>
            <Text style={styles.modalTitle}>Ажилтны үйлдэл</Text>
            <Text style={{ color: '#475569', marginVertical: 8, fontSize: 14 }}>
              {selectedEmployeeForAction?.surname || ''} {selectedEmployeeForAction?.name || ''} ({selectedEmployeeForAction?.emp_code || 'ID-гүй'})
            </Text>
            <Text style={{ color: '#64748B', marginBottom: 12, fontSize: 13 }}>
              Одоогийн өрөө: <Text style={{ fontWeight: '700', color: '#0284C7' }}>{selectedEmployeeForAction?.room_no}</Text> | Ээлж: {selectedEmployeeForAction?.shift}
            </Text>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: '#0284C7', marginTop: 4 }]}
              onPress={() => {
                setIsEmpActionModalVisible(false);
                if (selectedEmployeeForAction) {
                  handleOpenMoveModal(selectedEmployeeForAction);
                }
              }}
            >
              <Text style={styles.submitBtnText}>Өрөө шилжүүлэх (Зөөх)</Text>
            </TouchableOpacity>

            {selectedEmployeeForAction?.room_no !== 'EX' && (
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#DC2626', marginTop: 8 }]}
                onPress={() => {
                  setIsEmpActionModalVisible(false);
                  if (selectedEmployeeForAction) {
                    handleCheckout(selectedEmployeeForAction);
                  }
                }}
              >
                <Text style={styles.submitBtnText}>Кемпээс гаргах (EX)</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.cancelBtn, { marginTop: 8 }]}
              onPress={() => setIsEmpActionModalVisible(false)}
            >
              <Text style={styles.cancelBtnText}>Цуцлах</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: ADD / ASSIGN EMPLOYEE */}
      <Modal visible={isAddModalVisible} animationType="slide" transparent onRequestClose={() => setIsAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheetContainer}>
            <View style={styles.dragHandle} />
            <Text style={styles.modalTitle}>Шинэ ажилтан бүртгэх</Text>

            <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
              <Text style={styles.inputLabel}>Ажилтны ID / Код:</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Жишээ: A1234"
                value={formData.emp_code}
                onChangeText={(t) => setFormData({ ...formData, emp_code: t })}
              />

              <Text style={styles.inputLabel}>Овог *:</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Овог заавал"
                value={formData.surname}
                onChangeText={(t) => setFormData({ ...formData, surname: t })}
              />

              <Text style={styles.inputLabel}>Нэр *:</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Нэр заавал"
                value={formData.name}
                onChangeText={(t) => setFormData({ ...formData, name: t })}
              />

              <Text style={styles.inputLabel}>Албан тушаал *:</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Жишээ: Оператор"
                value={formData.job_position}
                onChangeText={(t) => setFormData({ ...formData, job_position: t })}
              />

              <Text style={styles.inputLabel}>Ээлж (Shift):</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                {['A', 'B', 'C', 'D'].map((sh) => (
                  <TouchableOpacity
                    key={sh}
                    style={[styles.shiftChip, formData.shift === sh && styles.shiftChipActive]}
                    onPress={() => setFormData({ ...formData, shift: sh })}
                  >
                    <Text style={[styles.shiftChipText, formData.shift === sh && styles.shiftChipTextActive]}>{sh}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Өрөөний дугаар * (Блок 1, 7, 8, 9):</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Жишээ: 701, 805, 924"
                value={formData.room_no}
                onChangeText={(t) => setFormData({ ...formData, room_no: t })}
                keyboardType="numeric"
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveNewEmployee}>
                <Text style={styles.submitBtnText}>Бүртгэл хадгалах</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsAddModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Цуцлах</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: MOVE ROOM */}
      <Modal visible={isMoveModalVisible} animationType="fade" transparent onRequestClose={() => setIsMoveModalVisible(false)}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.dialogCard}>
            <Text style={styles.modalTitle}>Өрөө Шилжүүлэх</Text>
            <Text style={{ color: '#475569', marginVertical: 8 }}>
              {movingEmployee?.surname || ''} {movingEmployee?.name || ''}-ийг өөр өрөө рүү шилжүүлэх:
            </Text>

            <TextInput
              style={styles.formInput}
              placeholder="Шинэ өрөөний дугаар (жишээ: 802)"
              value={targetRoomNo}
              onChangeText={setTargetRoomNo}
              keyboardType="numeric"
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={[styles.submitBtn, { flex: 1, marginTop: 0 }]} onPress={executeMoveRoom}>
                <Text style={styles.submitBtnText}>Шилжүүлэх</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelBtn, { flex: 1, marginTop: 0 }]}
                onPress={() => setIsMoveModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Цуцлах</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#64748B' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  headerSubtitle: { fontSize: 12, color: '#64748B' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  exportBtnText: { color: '#15803D', fontWeight: '700', fontSize: 13, marginLeft: 4 },
  mainContent: { flex: 1 },
  shiftSelectorContainer: { backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 6 },
  shiftScroll: { gap: 8 },
  shiftChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9' },
  shiftChipActive: { backgroundColor: '#2563EB' },
  shiftChipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  shiftChipTextActive: { color: '#FFFFFF' },
  blockFilterContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  blockBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#FFFFFF', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  blockBtnActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  blockBtnText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  blockBtnTextActive: { color: '#FFFFFF' },
  gridContainer: { paddingHorizontal: 12, paddingBottom: 80 },
  roomCard: { flex: 1, margin: 6, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  roomCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roomNumber: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  roomType: { fontSize: 13, color: '#64748B', marginVertical: 8 },
  roomCardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  occupancyText: { fontSize: 13, color: '#475569' },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', margin: 16, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A' },
  empCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  empAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  empAvatarText: { fontSize: 16, fontWeight: '700', color: '#0284C7' },
  empName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  empCode: { fontSize: 12, fontWeight: '400', color: '#64748B' },
  empJob: { fontSize: 12, color: '#475569', marginTop: 1 },
  empShift: { fontSize: 11, color: '#64748B', marginTop: 2 },
  roomBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  settingsTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  settingsOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  settingsOptionText: { fontSize: 15, fontWeight: '600', color: '#1E293B', marginLeft: 12 },
  fab: { position: 'absolute', right: 20, bottom: 85, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center', elevation: 6 },
  bottomBar: { flexDirection: 'row', height: 65, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', justifyContent: 'space-around', alignItems: 'center' },
  navItem: { alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontSize: 11, color: '#64748B', marginTop: 2 },
  navLabelActive: { color: '#2563EB', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheetContainer: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  dragHandle: { width: 40, height: 5, backgroundColor: '#CBD5E1', borderRadius: 3, alignSelf: 'center', marginBottom: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  modalSubTitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  emptyOccupants: { paddingVertical: 30, alignItems: 'center' },
  occupantItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  occupantName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  occupantJob: { fontSize: 12, color: '#64748B', marginTop: 2 },
  smallBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginTop: 10, marginBottom: 4 },
  formInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0F172A' },
  submitBtn: { backgroundColor: '#2563EB', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  cancelBtn: { backgroundColor: '#F1F5F9', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  cancelBtnText: { color: '#475569', fontWeight: '600', fontSize: 14 },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dialogCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, elevation: 5 },
});