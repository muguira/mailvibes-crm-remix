import { useState } from 'react'
import { TopNavbar } from '@/components/layout/top-navbar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Download } from 'lucide-react'
import { CustomButton } from '@/components/ui/custom-button'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

// Sample data for charts
const activityData = [
  { name: 'Rosie Roca', emails: 490, calls: 98, meetings: 32, followUps: 67 },
  { name: 'Kelly Singsank', emails: 352, calls: 127, meetings: 43, followUps: 78 },
  { name: 'Ryan DeForest', emails: 301, calls: 59, meetings: 18, followUps: 45 },
  { name: 'Jennifer Raffard', emails: 265, calls: 73, meetings: 27, followUps: 51 },
  { name: 'Edie Robinson', emails: 178, calls: 45, meetings: 19, followUps: 36 },
]

const pipelineData = [
  { name: 'Discovered', value: 42000 },
  { name: 'Qualified', value: 63000 },
  { name: 'Demo', value: 51000 },
  { name: 'Proposal', value: 43000 },
  { name: 'Negotiation', value: 28000 },
  { name: 'Closed Won', value: 19000 },
]

const salesData = [
  { month: 'Jan', actual: 18000, forecast: 20000 },
  { month: 'Feb', actual: 22000, forecast: 21000 },
  { month: 'Mar', actual: 31000, forecast: 25000 },
  { month: 'Apr', actual: 26000, forecast: 30000 },
  { month: 'May', actual: 29000, forecast: 32000 },
  { month: 'Jun', actual: 35000, forecast: 34000 },
  { month: 'Jul', actual: 30000, forecast: 36000 },
  { month: 'Aug', actual: 0, forecast: 38000 },
  { month: 'Sep', actual: 0, forecast: 40000 },
  { month: 'Oct', actual: 0, forecast: 42000 },
  { month: 'Nov', actual: 0, forecast: 45000 },
  { month: 'Dec', actual: 0, forecast: 50000 },
]

const Reports = () => {
  const [dateRange, setDateRange] = useState('May 1, 2023 - Aug 31, 2023')

  return (
    <div className="flex h-screen bg-slate-light/20">
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNavbar />

        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-lg shadow-relate overflow-hidden">
            <Tabs defaultValue="activity">
              <div className="flex justify-between items-center border-b border-slate-light/30 p-4">
                <TabsList>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
                  <TabsTrigger value="sales">Sales</TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 text-sm px-3 py-1.5 border border-slate-light/50 rounded hover:bg-slate-light/10">
                    <Calendar size={14} />
                    <span>{dateRange}</span>
                  </button>

                  <CustomButton variant="outline" size="sm" className="flex items-center gap-2">
                    <Download size={14} />
                    <span>Export CSV</span>
                  </CustomButton>
                </div>
              </div>

              <TabsContent value="activity" className="p-4">
                <h2 className="text-lg font-semibold mb-4">Activity Leaderboard</h2>
                <div className="h-80 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="emails" name="Emails" fill="#67BBAA" />
                      <Bar dataKey="calls" name="Calls" fill="#55998D" />
                      <Bar dataKey="meetings" name="Meetings" fill="#133340" />
                      <Bar dataKey="followUps" name="Follow-ups" fill="#F79849" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-light/50">
                        <th className="py-3 px-4 font-semibold text-sm">Name</th>
                        <th className="py-3 px-4 font-semibold text-sm text-right">Emails</th>
                        <th className="py-3 px-4 font-semibold text-sm text-right">Calls</th>
                        <th className="py-3 px-4 font-semibold text-sm text-right">Meetings</th>
                        <th className="py-3 px-4 font-semibold text-sm text-right">Follow Ups</th>
                        <th className="py-3 px-4 font-semibold text-sm text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityData.map((item, index) => {
                        const total = item.emails + item.calls + item.meetings + item.followUps
                        return (
                          <tr key={index} className="border-b border-slate-light/30">
                            <td className="py-3 px-4">{item.name}</td>
                            <td className="py-3 px-4 text-right">{item.emails}</td>
                            <td className="py-3 px-4 text-right">{item.calls}</td>
                            <td className="py-3 px-4 text-right">{item.meetings}</td>
                            <td className="py-3 px-4 text-right">{item.followUps}</td>
                            <td className="py-3 px-4 text-right font-semibold">{total}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="pipeline" className="p-4">
                <h2 className="text-lg font-semibold mb-4">Pipeline Value</h2>
                <div className="h-80 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pipelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={value => [`$${value}`, 'Value']} />
                      <Bar dataKey="value" name="Value" fill="#67BBAA" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-light/50">
                        <th className="py-3 px-4 font-semibold text-sm">Stage</th>
                        <th className="py-3 px-4 font-semibold text-sm text-right">Count</th>
                        <th className="py-3 px-4 font-semibold text-sm text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pipelineData.map((item, index) => (
                        <tr key={index} className="border-b border-slate-light/30">
                          <td className="py-3 px-4">{item.name}</td>
                          <td className="py-3 px-4 text-right">{Math.floor(item.value / 7000)}</td>
                          <td className="py-3 px-4 text-right font-semibold">${item.value.toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-light/10">
                        <td className="py-3 px-4 font-semibold">Total</td>
                        <td className="py-3 px-4 text-right font-semibold">
                          {pipelineData.reduce((sum, item) => sum + Math.floor(item.value / 7000), 0)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">
                          ${pipelineData.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="sales" className="p-4">
                <h2 className="text-lg font-semibold mb-4">Sales Performance</h2>
                <div className="h-80 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={value => [`$${value}`, 'Amount']} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        name="Actual"
                        stroke="#67BBAA"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="forecast"
                        name="Forecast"
                        stroke="#F79849"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-light/50">
                        <th className="py-3 px-4 font-semibold text-sm">Month</th>
                        <th className="py-3 px-4 font-semibold text-sm text-right">Actual</th>
                        <th className="py-3 px-4 font-semibold text-sm text-right">Forecast</th>
                        <th className="py-3 px-4 font-semibold text-sm text-right">Variance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesData.map((item, index) => {
                        const variance = item.actual - item.forecast
                        return (
                          <tr key={index} className="border-b border-slate-light/30">
                            <td className="py-3 px-4">{item.month}</td>
                            <td className="py-3 px-4 text-right">${item.actual.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right">${item.forecast.toLocaleString()}</td>
                            <td
                              className={`py-3 px-4 text-right ${variance >= 0 ? 'text-teal-primary' : 'text-coral'}`}
                            >
                              {variance >= 0 ? '+' : ''}
                              {variance.toLocaleString()}
                            </td>
                          </tr>
                        )
                      })}
                      <tr className="bg-slate-light/10">
                        <td className="py-3 px-4 font-semibold">YTD / Annual</td>
                        <td className="py-3 px-4 text-right font-semibold">
                          ${salesData.reduce((sum, item) => sum + item.actual, 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">
                          ${salesData.reduce((sum, item) => sum + item.forecast, 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">
                          $
                          {(
                            salesData.reduce((sum, item) => sum + item.actual, 0) -
                            salesData.reduce((sum, item) => sum + item.forecast, 0)
                          ).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Reports
