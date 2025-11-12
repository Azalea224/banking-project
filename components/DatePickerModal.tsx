import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import { BRAND_COLOR_MAIN } from "./AnimatedBackground";

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (date: string) => void;
  selectedDate?: string;
  title?: string;
}

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function DatePickerModal({
  visible,
  onClose,
  onSelectDate,
  selectedDate,
  title = "Select Date",
}: DatePickerModalProps) {
  const [currentDate, setCurrentDate] = useState(() => {
    if (selectedDate) {
      return new Date(selectedDate);
    }
    return new Date();
  });

  const [selectedDay, setSelectedDay] = useState<Date | null>(
    selectedDate ? new Date(selectedDate) : null
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  }, [startingDayOfWeek, daysInMonth]);

  const handleDayPress = (day: number) => {
    const selected = new Date(year, month, day);
    setSelectedDay(selected);
  };

  const handleSelect = () => {
    if (selectedDay) {
      const dateString = `${selectedDay.getFullYear()}-${String(
        selectedDay.getMonth() + 1
      ).padStart(2, "0")}-${String(selectedDay.getDate()).padStart(2, "0")}`;
      onSelectDate(dateString);
    }
    onClose();
  };

  const handleCancel = () => {
    if (selectedDate) {
      setSelectedDay(new Date(selectedDate));
      setCurrentDate(new Date(selectedDate));
    } else {
      setSelectedDay(null);
    }
    onClose();
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToPreviousYear = () => {
    setCurrentDate(new Date(year - 1, month, 1));
  };

  const goToNextYear = () => {
    setCurrentDate(new Date(year + 1, month, 1));
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    if (!selectedDay) return false;
    return (
      day === selectedDay.getDate() &&
      month === selectedDay.getMonth() &&
      year === selectedDay.getFullYear()
    );
  };

  // Format date for display
  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{title}</Text>
                {selectedDay && (
                  <Text style={styles.selectedDateText}>
                    {formatDate(selectedDay)}
                  </Text>
                )}
              </View>

              {/* Calendar Header with Month/Year Navigation */}
              <View style={styles.calendarHeader}>
                <View style={styles.monthYearContainer}>
                  <TouchableOpacity
                    style={styles.navButton}
                    onPress={goToPreviousYear}
                  >
                    <Text style={styles.navButtonText}>{"<<"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.navButton}
                    onPress={goToPreviousMonth}
                  >
                    <Text style={styles.navButtonText}>{"<"}</Text>
                  </TouchableOpacity>
                  <View style={styles.monthYearTextContainer}>
                    <Text style={styles.monthYearText}>
                      {MONTHS[month]} {year}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.navButton}
                    onPress={goToNextMonth}
                  >
                    <Text style={styles.navButtonText}>{">"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.navButton}
                    onPress={goToNextYear}
                  >
                    <Text style={styles.navButtonText}>{">>"}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Days of Week Header */}
              <View style={styles.daysOfWeekContainer}>
                {DAYS_OF_WEEK.map((day) => (
                  <View key={day} style={styles.dayOfWeekCell}>
                    <Text style={styles.dayOfWeekText}>{day}</Text>
                  </View>
                ))}
              </View>

              {/* Calendar Grid */}
              <View style={styles.calendarGrid}>
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return <View key={`empty-${index}`} style={styles.dayCell} />;
                  }

                  const isDayToday = isToday(day);
                  const isDaySelected = isSelected(day);

                  return (
                    <TouchableOpacity
                      key={`day-${day}`}
                      style={[
                        styles.dayCell,
                        isDayToday && styles.todayCell,
                        isDaySelected && styles.selectedCell,
                      ]}
                      onPress={() => handleDayPress(day)}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isDayToday && !isDaySelected && styles.todayText,
                          isDaySelected && styles.selectedDayText,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={handleCancel}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.selectButton,
                    !selectedDay && styles.selectButtonDisabled,
                  ]}
                  onPress={handleSelect}
                  disabled={!selectedDay}
                >
                  <Text
                    style={[
                      styles.selectButtonText,
                      !selectedDay && styles.selectButtonTextDisabled,
                    ]}
                  >
                    Select
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  selectedDateText: {
    fontSize: 14,
    color: BRAND_COLOR_MAIN,
    fontWeight: "600",
    marginTop: 4,
  },
  calendarHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  monthYearContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: BRAND_COLOR_MAIN,
  },
  monthYearTextContainer: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 8,
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  daysOfWeekContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  dayOfWeekCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayOfWeekText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  todayCell: {
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  todayText: {
    color: BRAND_COLOR_MAIN,
    fontWeight: "700",
  },
  selectedCell: {
    borderRadius: 20,
    backgroundColor: BRAND_COLOR_MAIN,
  },
  selectedDayText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    padding: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  selectButton: {
    backgroundColor: BRAND_COLOR_MAIN,
  },
  selectButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  selectButtonTextDisabled: {
    color: "#9CA3AF",
  },
});
