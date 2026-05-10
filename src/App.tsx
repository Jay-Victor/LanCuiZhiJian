import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppProvider } from '@/contexts/AppContext'
import { TaskManagerProvider } from '@/contexts/TaskManagerContext'
import { ToastContainer } from '@/components/ui/Toast'
import { GlobalErrorBoundary } from '@/components/error/GlobalErrorBoundary'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import ThemeProvider from '@/components/theme/ThemeProvider'
import { initGlobalErrorHandler } from '@/services/error/global-handler'
import Layout from './components/layout/Layout'
import HomePage from './app/routes/home'
import ReaderPage from './app/routes/reader'
import UrlReaderPage from './app/routes/reader/url'
import TextReaderPage from './app/routes/reader/text'
import FileReaderPage from './app/routes/reader/file'
import HistoryPage from './app/routes/history'
import SettingsPage from './app/routes/settings'
import TasksPage from './app/routes/tasks'
import AboutPage from './app/routes/about'
import DonatePage from './app/routes/donate'

initGlobalErrorHandler()

function App() {
  return (
    <GlobalErrorBoundary>
      <ThemeProvider>
        <AppProvider>
          <TaskManagerProvider>
            <BrowserRouter>
              <TooltipProvider>
                <ErrorBoundary>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/reader" element={<ReaderPage />} />
                      <Route path="/reader/url" element={<UrlReaderPage />} />
                      <Route path="/reader/text" element={<TextReaderPage />} />
                      <Route path="/reader/file" element={<FileReaderPage />} />
                      <Route path="/history" element={<HistoryPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/tasks" element={<TasksPage />} />
                      <Route path="/about" element={<AboutPage />} />
                      <Route path="/donate" element={<DonatePage />} />
                    </Routes>
                  </Layout>
                </ErrorBoundary>
                <ToastContainer />
              </TooltipProvider>
            </BrowserRouter>
          </TaskManagerProvider>
        </AppProvider>
      </ThemeProvider>
    </GlobalErrorBoundary>
  )
}

export default App
