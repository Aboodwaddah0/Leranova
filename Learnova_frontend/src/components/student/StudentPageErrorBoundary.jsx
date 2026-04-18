import React from 'react';

class StudentPageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unknown render error',
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Student page runtime crash:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const isArabic = typeof document !== 'undefined' && document?.documentElement?.dir === 'rtl';
      return (
        <div className="m-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
          {isArabic ? `حدث خطأ في صفحة الطالب: ${this.state.errorMessage}` : `Student page crashed: ${this.state.errorMessage}`}
        </div>
      );
    }

    return this.props.children;
  }
}

export default StudentPageErrorBoundary;
