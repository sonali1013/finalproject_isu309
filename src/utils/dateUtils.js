// Date utility functions for transaction reports

export const getToday = () => {
  const today = new Date();
  return {
    startDate: formatDate(today),
    endDate: formatDate(today)
  };
};

export const getMonthDates = (year, month) => {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  };
};

export const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDisplayDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getMonthName = (monthIndex) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthIndex];
};

export const getMonthOptions = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  const months = [];
  for (let i = 0; i <= currentMonth; i++) {
    months.push({
      label: `${getMonthName(i)} ${currentYear}`,
      value: { year: currentYear, month: i }
    });
  }
  
  // Add months from previous year
  const previousYear = currentYear - 1;
  for (let i = 11; i > currentMonth; i--) {
    months.push({
      label: `${getMonthName(i)} ${previousYear}`,
      value: { year: previousYear, month: i }
    });
  }
  
  return months.reverse();
};
