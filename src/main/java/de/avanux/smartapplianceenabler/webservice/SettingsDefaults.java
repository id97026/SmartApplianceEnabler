/*
 * Copyright (C) 2017 Axel Müller <axel.mueller@avanux.de>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

package de.avanux.smartapplianceenabler.webservice;

import de.avanux.smartapplianceenabler.meter.PulseReceiver;
import de.avanux.smartapplianceenabler.modbus.ModbusTcp;

public class SettingsDefaults {
    // static members won't be serialized but we need those values on the client
    private String holidaysUrl = "http://feiertage.jarmedia.de/api/?jahr={0}&nur_land=HE";
    private String modbusTcpHost = ModbusTcp.DEFAULT_HOST;
    private Integer modbusTcpPort = ModbusTcp.DEFAULT_PORT;
    private Integer pulseReceiverPort = PulseReceiver.DEFAULT_PORT;
    private static SettingsDefaults instance = new SettingsDefaults();

    public static String getHolidaysUrl() {
        return instance.holidaysUrl;
    }

    public static String getModbusTcpHost() {
        return instance.modbusTcpHost;
    }

    public static Integer getModbusTcpPort() {
        return instance.modbusTcpPort;
    }

    public static Integer getPulseReceiverPort() {
        return instance.pulseReceiverPort;
    }
}