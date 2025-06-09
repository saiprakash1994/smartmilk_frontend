import React, { Suspense } from 'react'
import { Route, BrowserRouter, Routes } from 'react-router-dom';
import Login from '../modules/authentication/pages/Login/Login';
import {
  MainLayout,
  DairyLayout,
  DairyPage,
  DashBoardLayout,
  DashBoardPage,
  DairyAdd,
  DeviceAdd,
  DeviceLayout,
  DevicePage,
  RecordsPage,
  SettingsLayout,
  SettingsPage,
  UploadsLayout,
  UploadsPage,
  MemberRecords,
  NotFoundPage
} from './pages';


import { Navigate } from 'react-router-dom';
import { AuthGuard } from '../shared/components/AuthGuard/AuthGuard';
import RecordLayout from '../modules/records/recordsLayout/RecordLayout';


export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <Login />
          } ></Route>
        <Route
          path=""
          element={
            <Suspense>
              <AuthGuard>
                <MainLayout />
              </AuthGuard>
            </Suspense>
          }>
          <Route index element={<Navigate to="dashboard" />} />
          <Route path="dashboard"
            element={
              <Suspense>
                < DashBoardLayout />
              </Suspense>
            }>
            <Route path=""
              element={
                <Suspense>
                  < DashBoardPage />
                </Suspense>
              }></Route>
          </Route>
          <Route path="/dairy"
            element={
              <Suspense>
                < DairyLayout />
              </Suspense>
            }>
            <Route path=""
              element={
                <Suspense>
                  < DairyPage />
                </Suspense>
              }></Route>
            <Route path="dairyadd"
              element={
                <Suspense>
                  < DairyAdd />
                </Suspense>
              }></Route>
            <Route path="edit/:dairyCode" element={<DairyAdd />} />

          </Route>
          <Route path="/device"
            element={
              <Suspense>
                < DeviceLayout />
              </Suspense>
            }>
            <Route path=""
              element={
                <Suspense>
                  < DevicePage />
                </Suspense>
              }></Route>
            <Route path="deviceadd"
              element={
                <Suspense>
                  < DeviceAdd />
                </Suspense>
              }></Route>
            <Route path="edit/:deviceid" element={<DeviceAdd />} />

          </Route>


          <Route path="/records"
            element={
              <Suspense>
                < RecordLayout />
              </Suspense>
            }>
            <Route path=""
              element={
                <Suspense>
                  < RecordsPage />
                </Suspense>
              }></Route>
            <Route path="member"
              element={
                <Suspense>
                  < MemberRecords />
                </Suspense>
              }></Route>

          </Route>
          <Route path="settings"
            element={
              <Suspense>
                < SettingsLayout />
              </Suspense>
            }>
            <Route path=""
              element={
                <Suspense>
                  < SettingsPage />
                </Suspense>
              }></Route>


          </Route>

          <Route path="uploads"
            element={
              <Suspense>
                < UploadsLayout />
              </Suspense>
            }>
            <Route path=""
              element={
                <Suspense>
                  < UploadsPage />
                </Suspense>
              }></Route>


          </Route>
          <Route path="*" element={<NotFoundPage />} />

        </Route>
      </Routes>
    </BrowserRouter>
  )
}
